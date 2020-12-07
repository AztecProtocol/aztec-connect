import { RollupProviderStatus, ServerRollupProvider, ServerRollupProviderExplorer } from 'barretenberg/rollup_provider';
import { EthereumBlockchain } from 'blockchain/ethereum_blockchain';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import createDebug from 'debug';
import isNode from 'detect-node';
import { mkdirSync } from 'fs';
import levelup from 'levelup';
import { SrirachaProvider } from 'sriracha/hash_path_source';
import { createConnection } from 'typeorm';
import { DexieDatabase, SQLDatabase, getOrmConfig } from '../database';
import { EthereumProvider } from 'blockchain';
import { SdkEvent, SdkInitState } from '../sdk';
import { AccountId } from '../user';
import { CoreSdk, CoreSdkEvent, CoreSdkOptions } from './core_sdk';

const debug = createDebug('bb:create_sdk');

function getLevelDb() {
  if (isNode) {
    mkdirSync('./data', { recursive: true });
    // eslint-disable-next-line
    return levelup(require('leveldown')('./data/aztec2-sdk.db'));
  } else {
    // eslint-disable-next-line
    return levelup(require('level-js')('aztec2-sdk'));
  }
}

async function getDb(dbPath = 'data') {
  if (isNode) {
    const config = getOrmConfig(dbPath);
    const connection = await createConnection(config);
    return new SQLDatabase(connection);
  } else {
    return new DexieDatabase();
  }
}

export type SdkOptions = {
  syncInstances?: boolean;
  clearDb?: boolean;
  debug?: boolean;
  dbPath?: string;
} & CoreSdkOptions;

async function sdkFactory(
  hostStr: string,
  options: SdkOptions,
  status: RollupProviderStatus,
  ethereumProvider: EthereumProvider,
) {
  if (options.debug) {
    createDebug.enable('bb:*');
  }

  const host = new URL(hostStr);
  const leveldb = getLevelDb();
  const db = await getDb(options.dbPath);

  if (options.clearDb) {
    await leveldb.clear();
    await db.clear();
  }

  const escapeHatchMode = status.serviceName === 'sriracha';

  if (!escapeHatchMode) {
    const rollupProvider = new ServerRollupProvider(host);
    const rollupProviderExplorer = new ServerRollupProviderExplorer(host);
    return new CoreSdk(leveldb, db, rollupProvider, rollupProviderExplorer, undefined, options, escapeHatchMode);
  } else {
    const srirachaProvider = new SrirachaProvider(host);
    const config = {
      networkOrHost: hostStr,
      console: false,
      gasLimit: 7000000,
    };
    const blockchain = await EthereumBlockchain.new(config, status.rollupContractAddress, ethereumProvider);
    return new CoreSdk(leveldb, db, blockchain, undefined, srirachaProvider, options, escapeHatchMode);
  }
}

/**
 * Construct an SDK instance. If passed the `syncInstances` option, will bind a channel to various events to
 * share events and synchronise instances. Only one instance will be the "leader" and that instance will receive
 * blocks from the block source and update the (shared) world state.
 */
export async function createSdk(
  hostStr: string,
  options: SdkOptions = {},
  status: RollupProviderStatus,
  ethereumProvider: EthereumProvider,
) {
  options = { syncInstances: true, saveProvingKey: true, ...options };
  const sdk = await sdkFactory(hostStr, options, status, ethereumProvider);
  if (!options.syncInstances) {
    // We're not going to sync across multiple instances. We should start recieving blocks once initialized.
    sdk.on(SdkEvent.UPDATED_INIT_STATE, state => {
      if (state === SdkInitState.INITIALIZED) {
        sdk.startReceivingBlocks();
      }
    });
  } else {
    // We're going to sync across multiple instances.
    const channel = new BroadcastChannel('aztec-sdk');

    // If this instance becomes the leader at any time, and we are initialized, start recieving blocks.
    const elector = createLeaderElection(channel, { responseTime: 2000 });
    elector.awaitLeadership().then(() => {
      if (sdk.getLocalStatus().initState === SdkInitState.INITIALIZED) {
        sdk.startReceivingBlocks();
      } else {
        debug('elected leader, will wait until initialized to process blocks.');
      }
    });
    sdk.on(SdkEvent.UPDATED_INIT_STATE, state => {
      if (state === SdkInitState.INITIALIZED && elector.isLeader) {
        sdk.startReceivingBlocks();
      } else if (state === SdkInitState.DESTROYED) {
        channel.close();
      }
    });

    sdk.on(CoreSdkEvent.UPDATED_WORLD_STATE, () => channel.postMessage({ name: CoreSdkEvent.UPDATED_WORLD_STATE }));
    sdk.on(CoreSdkEvent.UPDATED_USERS, () => channel.postMessage({ name: CoreSdkEvent.UPDATED_USERS }));
    sdk.on(
      CoreSdkEvent.UPDATED_USER_STATE,
      (userId: AccountId, balanceAfter?: bigint, diff?: bigint, assetId?: number) =>
        channel.postMessage({
          name: CoreSdkEvent.UPDATED_USER_STATE,
          userId: userId.toString(),
          balanceAfter: balanceAfter?.toString(),
          diff: diff?.toString(),
          assetId,
        }),
    );
    sdk.on(CoreSdkEvent.CLEAR_DATA, () => channel.postMessage({ name: CoreSdkEvent.CLEAR_DATA }));

    channel.onmessage = msg => {
      if (sdk.getLocalStatus().initState !== SdkInitState.INITIALIZED) {
        return;
      }
      switch (msg.name) {
        case CoreSdkEvent.UPDATED_WORLD_STATE:
          sdk.notifyWorldStateUpdated();
          break;
        case CoreSdkEvent.UPDATED_USERS:
          sdk.initUserStates();
          break;
        case CoreSdkEvent.UPDATED_USER_STATE:
          sdk.notifyUserStateUpdated(
            AccountId.fromString(msg.userId),
            msg.balanceAfter ? BigInt(msg.balanceAfter) : undefined,
            msg.diff ? BigInt(msg.diff) : undefined,
            msg.assetId,
          );
          break;
        case CoreSdkEvent.CLEAR_DATA:
          sdk.notifiedClearData();
          break;
      }
    };
  }
  return sdk;
}

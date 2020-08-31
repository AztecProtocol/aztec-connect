import { ServerRollupProvider, ServerRollupProviderExplorer } from 'barretenberg/rollup_provider';
import { ServerBlockSource } from 'barretenberg/block_source';
import { DexieDatabase } from '../database';
import { CoreSdk, CoreSdkEvent, CoreSdkOptions } from './core_sdk';
import levelup from 'levelup';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import { SdkEvent, SdkInitState } from '../sdk';
import createDebug from 'debug';
import isNode from 'detect-node';
import { mkdirSync } from 'fs';
import { EthereumProvider } from '../ethereum_provider';
import { EthAddress } from 'barretenberg/address';

const debug = createDebug('bb:create_sdk');

function getLevelDb() {
  if (isNode) {
    mkdirSync('./data', { recursive: true });
    return levelup(require('leveldown')('./data/aztec2-sdk.db'));
  } else {
    return levelup(require('level-js')('aztec2-sdk'));
  }
}

type SdkOptions = { syncInstances?: boolean; clearDb?: boolean } & CoreSdkOptions;

/**
 * Construct an SDK instance. If passed the `syncInstances` option, will bind a channel to various events to
 * share events and synchronise instances. Only one instance will be the "leader" and that instance will receive
 * blocks from the block source and update the (shared) world state.
 */
export async function createSdk(hostStr: string, ethereumProvider: EthereumProvider, options: SdkOptions = {}) {
  options = { syncInstances: true, saveProvingKey: true, ...options };
  const host = new URL(hostStr);
  const leveldb = getLevelDb();
  const rollupProvider = new ServerRollupProvider(host);
  const rollupProviderExplorer = new ServerRollupProviderExplorer(host);
  const blockSource = new ServerBlockSource(host);
  const db = new DexieDatabase();
  const sdk = new CoreSdk(ethereumProvider, leveldb, db, rollupProvider, rollupProviderExplorer, blockSource, options);

  if (options.clearDb) {
    await leveldb.clear();
    await db.resetUsers();
  }

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
    sdk.on(CoreSdkEvent.UPDATED_USER_STATE, (ethAddress: EthAddress) =>
      channel.postMessage({ name: CoreSdkEvent.UPDATED_USER_STATE, ethAddress: ethAddress.toString() }),
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
          sdk.notifyUserStateUpdated(EthAddress.fromString(msg.ethAddress));
          break;
        case CoreSdkEvent.CLEAR_DATA:
          sdk.notifiedClearData();
          break;
      }
    };
  }

  return sdk;
}

export async function getRollupProviderStatus(hostStr: string) {
  const rollupProvider = new ServerRollupProvider(new URL(hostStr));
  return rollupProvider.status();
}

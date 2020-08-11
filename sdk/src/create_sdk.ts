import { ServerRollupProvider, ServerRollupProviderExplorer } from 'barretenberg/rollup_provider';
import { ServerBlockSource, Block } from 'barretenberg/block_source';
import { DexieDatabase } from './database';
import { CoreSdk, CoreSdkEvent, CoreSdkOptions } from './core_sdk';
import levelup from 'levelup';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import { SdkEvent, SdkInitState } from './sdk';
import createDebug from 'debug';
import isNode from 'detect-node';
import { mkdirSync } from 'fs';

const debug = createDebug('bb:create_sdk');

const channelBlockToBlock = (block: any): Block => ({
  ...block,
  txHash: Buffer.from(block.txHash),
  dataEntries: block.dataEntries.map(Buffer.from),
  nullifiers: block.nullifiers.map(Buffer.from),
  viewingKeys: block.viewingKeys.map(Buffer.from),
});

type SdkOptions = { syncInstances?: boolean; clearDb?: boolean } & CoreSdkOptions;

/**
 * Construct an SDK instance. If passed the `syncInstances` option, will bind a channel to various events to
 * share events and synchronise instances. Only one instance will be the "leader" and that instance will receive
 * blocks from the block source and update the (shared) world state.
 */
export async function createSdk(hostStr: string, options: SdkOptions = {}) {
  options = { syncInstances: true, saveProvingKey: true, ...options };
  const host = new URL(hostStr);
  isNode && mkdirSync('./data', { recursive: true });
  const leveldb = levelup(isNode ? require('leveldown')('./data/aztec2-sdk.db') : require('level-js')('aztec2-sdk'));
  const rollupProvider = new ServerRollupProvider(host);
  const rollupProviderExplorer = new ServerRollupProviderExplorer(host);
  const blockSource = new ServerBlockSource(host);
  const db = new DexieDatabase();
  const sdk = new CoreSdk(leveldb, db, rollupProvider, rollupProviderExplorer, blockSource, options);

  if (options.clearDb) {
    await leveldb.clear();
    await db.clearNote();
    await db.clearUserTxState();
  }

  if (!options.syncInstances) {
    sdk.on(SdkEvent.UPDATED_INIT_STATE, state => {
      if (state === SdkInitState.INITIALIZED) {
        sdk.startReceivingBlocks();
      }
    });
  } else {
    const channel = new BroadcastChannel('aztec-sdk');
    const elector = createLeaderElection(channel, { responseTime: 2000 });
    elector.awaitLeadership().then(() => {
      if (sdk.getInitState() === SdkInitState.INITIALIZED) {
        sdk.startReceivingBlocks();
      } else {
        debug('elected leader, will wait until initialized to process blocks.');
      }
    });

    sdk.on(CoreSdkEvent.BLOCK_PROCESSED, (block: Block) =>
      channel.postMessage({ name: CoreSdkEvent.BLOCK_PROCESSED, block }),
    );
    sdk.on(CoreSdkEvent.UPDATED_USERS, () => channel.postMessage({ name: CoreSdkEvent.UPDATED_USERS }));
    sdk.on(CoreSdkEvent.NEW_USER_TX, (userId: number) =>
      channel.postMessage({ name: CoreSdkEvent.NEW_USER_TX, userId }),
    );
    sdk.on(CoreSdkEvent.RESTART, () => channel.postMessage({ name: CoreSdkEvent.RESTART }));

    sdk.on(SdkEvent.UPDATED_INIT_STATE, state => {
      if (state === SdkInitState.INITIALIZED && elector.isLeader) {
        sdk.startReceivingBlocks();
      } else if (state === SdkInitState.DESTROYED) {
        channel.close();
      }
    });

    channel.onmessage = msg => {
      switch (msg.name) {
        case CoreSdkEvent.BLOCK_PROCESSED:
          sdk.handleBlockEvent(channelBlockToBlock(msg.block));
          break;
        case CoreSdkEvent.UPDATED_USERS:
          sdk.initUsers();
          break;
        case CoreSdkEvent.NEW_USER_TX:
          // Emit UPDATED rather than NEW, as UPDATE semantics imply an asynchronous update.
          sdk.emit(SdkEvent.UPDATED_USER_TX, msg.userId);
          break;
        case CoreSdkEvent.RESTART:
          sdk.restart();
          break;
      }
    };
  }

  return sdk;
}

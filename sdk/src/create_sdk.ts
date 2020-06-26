import { ServerRollupProvider, ServerRollupProviderExplorer } from 'barretenberg/rollup_provider';
import { ServerBlockSource, Block } from 'barretenberg/block_source';
import { DexieDatabase } from './database';
import { CoreSdk, CoreSdkEvent } from './core_sdk';
import leveljs from 'level-js';
import levelup from 'levelup';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import { SdkEvent, SdkInitState } from './sdk';
import createDebug from 'debug';

const debug = createDebug('bb:create_sdk');

const channelBlockToBlock = (block: any): Block => ({
  ...block,
  txHash: Buffer.from(block.txHash),
  dataEntries: block.dataEntries.map(Buffer.from),
  nullifiers: block.nullifiers.map(Buffer.from),
  viewingKeys: block.viewingKeys.map(Buffer.from),
});

export async function createSdk(hostStr: string) {
  const host = new URL(hostStr);
  const leveldb = levelup(leveljs('hummus'));
  const rollupProvider = new ServerRollupProvider(host);
  const rollupProviderExplorer = new ServerRollupProviderExplorer(host);
  const blockSource = new ServerBlockSource(host);
  const db = new DexieDatabase();
  const sdk = new CoreSdk(leveldb, db, rollupProvider, rollupProviderExplorer, blockSource);

  const channel = new BroadcastChannel('aztec-sdk');
  const elector = createLeaderElection(channel, { responseTime: 2000 });
  elector.awaitLeadership().then(() => {
    if (sdk.getInitState() === SdkInitState.INITIALIZED) {
      sdk.startReceivingBlocks();
    } else {
      debug('elected leader, will await until until initialized to process blocks.');
    }
  });

  sdk.on(CoreSdkEvent.BLOCK_PROCESSED, (block: Block) =>
    channel.postMessage({ name: CoreSdkEvent.BLOCK_PROCESSED, block }),
  );
  sdk.on(CoreSdkEvent.UPDATED_USERS, () => channel.postMessage({ name: CoreSdkEvent.UPDATED_USERS }));
  sdk.on(CoreSdkEvent.NEW_USER_TX, (userId: number) => channel.postMessage({ name: CoreSdkEvent.NEW_USER_TX, userId }));
  sdk.on(CoreSdkEvent.RESTART, () => channel.postMessage({ name: CoreSdkEvent.RESTART }));

  sdk.on(SdkEvent.UPDATED_INIT_STATE, state => {
    if (state === SdkInitState.INITIALIZED && elector.isLeader) {
      sdk.startReceivingBlocks();
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

  return sdk;
}

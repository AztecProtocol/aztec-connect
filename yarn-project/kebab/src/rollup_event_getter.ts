import { EthAddress } from '@aztec/barretenberg/address';
import { getEarliestBlock } from '@aztec/blockchain';
import { createLogger } from '@aztec/barretenberg/log';
import { JsonRpcProvider } from '@aztec/blockchain';
import { EthLogsDb } from './log_db.js';

export const ROLLUP_PROCESSED_EVENT_TOPIC = '0x14054a15b39bfd65ec00fc6d15c7e5f9cbc1dc6f452cbefa359b4da61ad89fb6';
export const DEFI_BRIDGE_EVENT_TOPIC = '0x692cf5822a02f5edf084dc7249b3a06293621e069f11975ed70908ed10ed2e2c';
export const OFFCHAIN_EVENT_TOPIC = '0xb92710e3fad9222f817fcd828bd1ce3612ad0cd1c8bd5f3a3f4b8d85c4444621';

export type EthEvent = {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
};

export class RollupEventGetter {
  private lastQueriedBlockNum: number;
  private log = createLogger('RollupEventGetter');

  constructor(
    protected rollupContractAddress: EthAddress,
    private provider: JsonRpcProvider,
    private chainId: number,
    private logsDb: EthLogsDb,
  ) {
    this.lastQueriedBlockNum = this.getEarliestBlock().earliestBlock;
  }

  public getEarliestBlock() {
    return getEarliestBlock(this.chainId);
  }

  public async getLatestBlockNumber() {
    return parseInt(
      await this.provider.request({
        method: 'eth_blockNumber',
      }),
    );
  }

  public getLastQueriedBlockNum(): number {
    return this.lastQueriedBlockNum;
  }

  public async init() {
    await this.getAndStoreRollupBlocksFrom(this.getEarliestBlock().earliestBlock, this.logsDb);
  }

  public async getLatestRollupEvents(): Promise<EthEvent[]> {
    const latestBlock = await this.getLatestBlockNumber();
    if (latestBlock > this.lastQueriedBlockNum) {
      this.log(`Getting new blocks, latest block ${latestBlock}, last queried block ${this.lastQueriedBlockNum}`);
      return this.getAndStoreRollupBlocksFrom(this.lastQueriedBlockNum + 1, this.logsDb);
    }
    return [];
  }

  // we do the DB storing inside here so that we are 100% certain that rollups are present
  public async getAndStoreRollupBlocksFrom(blockNumber: number, db?: EthLogsDb): Promise<EthEvent[]> {
    const { earliestBlock, chunk } = this.getEarliestBlock();
    const latestBlock = await this.getLatestBlockNumber();
    let start = Math.max(blockNumber || 0, earliestBlock);
    let end = Math.min(start + chunk - 1, latestBlock);
    const totalStartTime = new Date().getTime();
    let events: EthEvent[] = [];
    let eventsLength = 0;

    while (start <= latestBlock) {
      const startTime = new Date().getTime();
      const logsRequest = (topic: string) => {
        return this.provider.request({
          method: 'eth_getLogs',
          params: [
            {
              address: this.rollupContractAddress.toString(),
              topics: [topic],
              fromBlock: `0x${start.toString(16)}`,
              toBlock: `0x${end.toString(16)}`,
            },
          ],
        });
      };
      const [rollupEvents, defiBridgeEvents] = await Promise.all([
        logsRequest(ROLLUP_PROCESSED_EVENT_TOPIC),
        logsRequest(DEFI_BRIDGE_EVENT_TOPIC),
      ]);
      this.log(
        `${start} -> ${end} ${rollupEvents.length} rollupProcessed and ${
          defiBridgeEvents.length
        } defiBridge events fetched in ${(new Date().getTime() - startTime) / 1000}s`,
      );
      // cache the last eth block number where we actually received an event
      const latestRollupBlock = rollupEvents.length ? rollupEvents[rollupEvents.length - 1].blockNumber : earliestBlock;
      const latestDefiBlock = defiBridgeEvents.length
        ? defiBridgeEvents[defiBridgeEvents.length - 1].blockNumber
        : earliestBlock;
      this.lastQueriedBlockNum = Math.max(latestRollupBlock, latestDefiBlock, this.lastQueriedBlockNum);

      // if db has been passed, store directly
      if (db) {
        const eventsToStore = [...rollupEvents, ...defiBridgeEvents];
        eventsLength += eventsToStore.length;
        await db.addEthLogs(eventsToStore);
      } else {
        events = [...rollupEvents, ...defiBridgeEvents, ...events];
      }

      start = end + 1;
      end = Math.min(start + chunk - 1, latestBlock);
    }

    this.log(
      `done: ${db ? eventsLength : events.length} fetched in ${(new Date().getTime() - totalStartTime) / 1000}s`,
    );

    return events;
  }
}

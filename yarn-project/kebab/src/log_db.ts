import { SerialQueue } from '@aztec/barretenberg/fifo';
import { Connection, Repository, Between, Like, getConnection } from 'typeorm';
import { EthEventDao } from './entity/eth_event.js';
import { EthEvent } from './eth_event.js';

export interface RollupLogsParamsQuery {
  topics: string[];
  address?: string;
  fromBlock?: number;
  toBlock?: number;
  blockHash?: string;
}

export interface EventStore {
  addEthLogs(logs: EthEvent[]): Promise<void>;
}

export class EthLogsDb implements EventStore {
  private ethEventRep: Repository<EthEventDao>;
  private jobQueue = new SerialQueue();

  constructor(private connection: Connection) {
    this.ethEventRep = this.connection.getRepository(EthEventDao);
    this.jobQueue.start();
  }

  /**
   * PUBLIC INTERFACE
   * All DB methods should be executed on the job queue to ensure required synchronisation
   */

  public async getLastEvent(mainTopic: string): Promise<EthEvent | undefined> {
    return await this.synchronise(() => this._getLastEvent(mainTopic));
  }

  public async queryEthLogs(params: RollupLogsParamsQuery): Promise<EthEvent[]> {
    return await this.synchronise(() => this._queryEthLogs(params));
  }

  public async addEthLogs(logs: EthEvent[]): Promise<void> {
    await this.synchronise(() => this._addEthLogs(logs));
  }

  public async stop() {
    await this.jobQueue.end();
  }

  /**
   * PRIVATE METHODS
   */

  private async synchronise<T>(fn: () => Promise<T>): Promise<T> {
    return await this.jobQueue.put(fn);
  }

  private async _addEthLogs(logs: EthEvent[]) {
    let commited = false;
    let batchSize = 200;
    while (!commited) {
      const logsCopy = [...logs];
      const connection = getConnection(this.connection.name);
      const queryRunner = connection.createQueryRunner();

      // establish real database connection using our new query runner
      await queryRunner.connect();
      const entities = queryRunner.manager.getRepository<EthEventDao>('EthEventDao');
      await queryRunner.startTransaction();
      try {
        while (logsCopy.length) {
          const logsSlice = logsCopy.slice(0, batchSize).map(this.formatData);
          await entities.save(logsSlice);
          logsCopy.splice(0, batchSize);
        }
        await queryRunner.commitTransaction();
        await queryRunner.release();
        commited = true;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        batchSize /= 2;
        if (batchSize < 1) {
          throw new Error(`Unable to insert logs, error: ${err}`);
        }
        batchSize = Math.round(batchSize);
      }
    }
  }

  private async _queryEthLogs(params: RollupLogsParamsQuery): Promise<EthEvent[]> {
    const query: any = {
      ...(params.blockHash && { blockHash: params.blockHash.toLowerCase() }),
      ...(params.address && { address: params.address.toLowerCase() }),
      // if blockHash parameter exists, from-to block are ignored
      ...(!params.blockHash && { blockNumber: Between(params.fromBlock, params.toBlock) }),
    };
    // single topic queried
    if (params.topics.length === 1) {
      query.mainTopic = params.topics[0].toLowerCase();
    } else if (params.topics.length) {
      query.topics = Like(`${params.topics.map(t => t.toLowerCase()).join(',')}%`);
    }

    const result = await this.ethEventRep.find({
      where: query,
      order: { blockNumber: 'ASC' },
    });

    return result.map(this.serializeData);
  }

  private async _getLastEvent(mainTopic: string): Promise<EthEvent | undefined> {
    const latest = await this.ethEventRep.find({ where: { mainTopic }, order: { blockNumber: 'DESC' }, take: 1 });
    return latest.length ? this.serializeData(latest[0]) : undefined;
  }

  private formatData(ethEvent: EthEvent): EthEventDao {
    const { logIndex, transactionIndex, blockNumber, topics, ...event } = ethEvent;
    return new EthEventDao({
      ...event,
      logIndex: parseInt(logIndex),
      transactionIndex: parseInt(transactionIndex),
      blockNumber: parseInt(blockNumber),
      mainTopic: topics[0],
      topics,
    });
  }

  private serializeData(eventDao: EthEventDao): EthEvent {
    const { blockNumber, logIndex, transactionIndex, ...rest } = eventDao;
    return {
      ...rest,
      blockNumber: `0x${blockNumber.toString(16)}`,
      logIndex: `0x${logIndex?.toString(16)}`,
      transactionIndex: `0x${transactionIndex?.toString(16)}`,
    };
  }
}

import { Connection, Repository, Between, Like, getConnection } from 'typeorm';

import { EthEventDao } from './entity/eth_event.js';
import { EthEvent } from './rollup_event_getter.js';

export interface RollupLogsParamsQuery {
  topics: string[];
  address?: string;
  fromBlock?: number;
  toBlock?: number;
  blockHash?: string;
}

export class EthLogsDb {
  private ethEventRep: Repository<EthEventDao>;

  constructor(private connection: Connection) {
    this.ethEventRep = this.connection.getRepository(EthEventDao);
  }

  public async addEthLogs(logs: EthEvent[]) {
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

  public async queryEthLogs(params: RollupLogsParamsQuery): Promise<EthEvent[]> {
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

  public async getAllEventLogs() {
    const allRollupEvents = await this.ethEventRep.find();
    return allRollupEvents;
  }

  public async getRollupEventsInBlockRange(fromBlock: number, toBlock: number) {
    const events = await this.ethEventRep.find({
      where: {
        blockNumber: Between(fromBlock, toBlock),
      },
    });

    return events;
  }

  public async eraseDb() {
    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.delete(this.ethEventRep.target, {});
    });
  }

  public formatData(ethEvent: EthEvent): EthEventDao {
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

  public async getLastKnownBlockNumber() {
    const latest = await this.ethEventRep.find({ order: { blockNumber: 'DESC' }, take: 1 });
    return latest[0]?.blockNumber || 0;
  }
}

import { RollupProviderStatus } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { Int, Resolver, FieldResolver, Query } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Not, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { ServerConfig } from '../server';
import { HexString, ISODateTime } from './scalar_type';
import { ServerStatusType } from './server_status_type';

interface StaticServerStatus {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: string;
}

@Resolver(() => ServerStatusType)
export class ServerStatusResolver {
  private readonly rollupRep: Repository<RollupDao>;
  private readonly rollupTxRep: Repository<TxDao>;
  private readonly staticServerStatus: StaticServerStatus;

  constructor(
    @Inject('connection') connection: Connection,
    @Inject('worldStateDb') private readonly worldStateDb: WorldStateDb,
    @Inject('serverConfig') private readonly serverConfig: ServerConfig,
    @Inject('serverStatus') serverStatus: RollupProviderStatus,
  ) {
    this.rollupRep = connection.getRepository(RollupDao);
    this.rollupTxRep = connection.getRepository(TxDao);
    this.staticServerStatus = {
      chainId: serverStatus.chainId,
      networkOrHost: serverStatus.networkOrHost,
      rollupContractAddress: serverStatus.rollupContractAddress.toString(),
    };
  }

  @Query(() => ServerStatusType)
  serverStatus() {
    return this.staticServerStatus;
  }

  @FieldResolver(() => Int)
  dataSize() {
    return Number(this.worldStateDb.getSize(0));
  }

  @FieldResolver(() => HexString)
  dataRoot() {
    return this.worldStateDb.getRoot(0);
  }

  @FieldResolver(() => HexString)
  nullRoot() {
    return this.worldStateDb.getRoot(1);
  }

  @FieldResolver(() => HexString)
  rootRoot() {
    return this.worldStateDb.getRoot(2);
  }

  @FieldResolver(() => ISODateTime, { nullable: true })
  async nextPublishTime() {
    const avgProofTime = 30 * 1000;
    const avgSettleTime = 60 * 1000;

    const pendingRollup = await this.rollupRep.findOne({
      where: { status: Not('SETTLED') },
      order: { id: 'ASC' },
    });
    if (pendingRollup) {
      return new Date(pendingRollup.created.getTime() + avgProofTime + avgSettleTime);
    }

    const pendingTx = await this.rollupTxRep.findOne({
      where: { rollup: null },
      order: { created: 'ASC' },
    });
    if (pendingTx) {
      return new Date(
        pendingTx.created.getTime() +
          this.serverConfig.maxRollupWaitTime.asMilliseconds() +
          avgProofTime +
          avgSettleTime,
      );
    }

    return undefined;
  }
}

import { RollupProviderStatus } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { Int, Resolver, FieldResolver, Query } from 'type-graphql';
import { Inject } from 'typedi';
import { Server } from '../server';
import { HexString, ISODateTime } from './scalar_type';
import { ServerStatusType } from './server_status_type';

interface StaticServerStatus {
  chainId: number;
  rollupContractAddress: string;
}

@Resolver(() => ServerStatusType)
export class ServerStatusResolver {
  private readonly staticServerStatus: StaticServerStatus;

  constructor(
    @Inject('server') private readonly server: Server,
    @Inject('worldStateDb') private readonly worldStateDb: WorldStateDb,
    @Inject('serverStatus') serverStatus: RollupProviderStatus,
  ) {
    this.staticServerStatus = {
      chainId: serverStatus.blockchainStatus.chainId,
      rollupContractAddress: serverStatus.blockchainStatus.rollupContractAddress.toString(),
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
    return this.server.getNextPublishTime();
  }
}

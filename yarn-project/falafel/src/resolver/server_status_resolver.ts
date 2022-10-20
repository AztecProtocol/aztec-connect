import { BlockchainStatus } from '@aztec/barretenberg/blockchain';
import { FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Server } from '../server.js';
import { ISODateTime } from './scalar_type.js';
import { ServerStatusType } from './server_status_type.js';

@Resolver(() => ServerStatusType)
export class ServerStatusResolver {
  constructor(@Inject('server') private readonly server: Server) {}

  @Query(() => ServerStatusType)
  async serverStatus() {
    return (await this.server.getStatus()).blockchainStatus;
  }

  @FieldResolver()
  rollupContractAddress(@Root() { rollupContractAddress }: BlockchainStatus) {
    return rollupContractAddress.toString();
  }

  @FieldResolver()
  async pendingTxCount() {
    const { pendingTxCount } = await this.server.getStatus();
    return pendingTxCount;
  }

  @FieldResolver(() => ISODateTime, { nullable: true })
  async nextPublishTime() {
    const { nextPublishTime } = await this.server.getStatus();
    return nextPublishTime;
  }
}

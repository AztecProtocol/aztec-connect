import { BlockchainStatus } from 'barretenberg/blockchain';
import { FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Server } from '../server';
import { ISODateTime } from './scalar_type';
import { ServerStatusType } from './server_status_type';

@Resolver(() => ServerStatusType)
export class ServerStatusResolver {
  constructor(@Inject('server') private readonly server: Server) {}

  @Query(() => ServerStatusType)
  async serverStatus() {
    return (await this.server.getStatus()).blockchainStatus;
  }

  @FieldResolver()
  async rollupContractAddress(@Root() { rollupContractAddress }: BlockchainStatus) {
    return rollupContractAddress.toString();
  }

  @FieldResolver(() => ISODateTime, { nullable: true })
  async nextPublishTime() {
    return this.server.getNextPublishTime();
  }
}

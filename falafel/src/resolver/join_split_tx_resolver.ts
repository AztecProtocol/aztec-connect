import { Query, Resolver, FieldResolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { CachedRollupDb } from '../rollup_db';
import { JoinSplitTxType } from './join_split_tx_type';
import { JoinSplitTxDao } from '../entity/join_split_tx';

@Resolver(() => JoinSplitTxType)
export class JoinSplitTxResolver {
  constructor(@Inject('rollupDb') private rollupDb: CachedRollupDb) {}

  @Query(() => [JoinSplitTxType!])
  async unsettledJoinSplitTxs() {
    return this.rollupDb.getUnsettledJoinSplitTxs();
  }

  @FieldResolver()
  async inputOwner(@Root() { inputOwner }: JoinSplitTxDao) {
    return inputOwner.toBuffer();
  }

  @FieldResolver()
  async outputOwner(@Root() { outputOwner }: JoinSplitTxDao) {
    return outputOwner.toBuffer();
  }
}

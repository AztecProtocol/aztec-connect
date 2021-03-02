import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { Query, Resolver, FieldResolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { TxDao } from '../entity/tx';
import { CachedRollupDb } from '../rollup_db';
import { JoinSplitTxType } from './join_split_tx_type';

@Resolver(() => JoinSplitTxType)
export class JoinSplitTxResolver {
  constructor(@Inject('rollupDb') private rollupDb: CachedRollupDb) {}

  @Query(() => [JoinSplitTxType!])
  async unsettledJoinSplitTxs() {
    return this.rollupDb.getUnsettledJoinSplitTxs();
  }

  @FieldResolver()
  async inputOwner(@Root() { proofData }: TxDao) {
    return new ProofData(proofData).inputOwner;
  }

  @FieldResolver()
  async outputOwner(@Root() { proofData }: TxDao) {
    return new ProofData(proofData).outputOwner;
  }
}

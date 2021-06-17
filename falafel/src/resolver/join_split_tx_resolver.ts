import { ProofData, JoinSplitProofData } from '@aztec/barretenberg/client_proofs/proof_data';
import { Query, Resolver, FieldResolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { CachedRollupDb } from '../rollup_db';
import { JoinSplitTxType } from './join_split_tx_type';

@Resolver(() => JoinSplitTxType)
export class JoinSplitTxResolver {
  constructor(@Inject('rollupDb') private rollupDb: CachedRollupDb) {}

  @Query(() => [JoinSplitTxType!])
  async unsettledJoinSplitTxs() {
    const txs = await this.rollupDb.getUnsettledJoinSplitTxs();
    return txs.map(({ proofData, ...rest }) => {
      const joinSplitProofData = new JoinSplitProofData(new ProofData(proofData));
      return {
        ...rest,
        proofData,
        joinSplitProofData,
      };
    });
  }

  @FieldResolver()
  async inputOwner(@Root() { joinSplitProofData }: any) {
    return joinSplitProofData.inputOwner.toString();
  }

  @FieldResolver()
  async publicInput(@Root() { joinSplitProofData }: any) {
    return joinSplitProofData.publicInput;
  }

  @FieldResolver()
  async publicOutput(@Root() { joinSplitProofData }: any) {
    return joinSplitProofData.publicOutput;
  }

  @FieldResolver()
  async assetId(@Root() { joinSplitProofData }: any) {
    return joinSplitProofData.assetId;
  }

  @FieldResolver()
  async outputOwner(@Root() { joinSplitProofData }: any) {
    return joinSplitProofData.outputOwner.toString();
  }
}

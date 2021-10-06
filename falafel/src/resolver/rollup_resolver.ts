import { RollupProofData } from 'barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { RollupDao } from '../entity/rollup';
import { CachedRollupDb } from '../rollup_db';
import { FieldAliases } from './query_builder';
import { RollupsArgs, RollupType } from './rollup_type';

@Resolver(() => RollupType)
export class RollupResolver {
  private rollupDb: CachedRollupDb;

  private fieldAliases: FieldAliases = {};

  constructor(@Inject('rollupDb') rollupDb: CachedRollupDb) {
    this.rollupDb = rollupDb;

    this.fieldAliases.hash = 'id';
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(@Arg('id', () => Int) id: number) {
    return this.rollupDb.getRollup(id);
  }

  @Query(() => [RollupType!])
  async rollups(@Args() { take, skip }: RollupsArgs) {
    const data = await this.rollupDb.getRollups(take!, skip!, true);
    return data;
  }

  @FieldResolver()
  hash(@Root() { rollupProof: { id } }: RollupDao) {
    return id;
  }

  @FieldResolver()
  ethTxHash(@Root() { ethTxHash }: RollupDao) {
    return ethTxHash;
  }

  @FieldResolver()
  async mined(@Root() { mined }: RollupDao) {
    return mined;
  }

  @FieldResolver()
  async oldDataRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRoot : undefined;
  }

  @FieldResolver()
  async proofData(@Root() { rollupProof: { proofData } }: RollupDao) {
    return proofData;
  }

  @FieldResolver()
  async dataRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newDataRoot : undefined;
  }

  @FieldResolver()
  async oldNullifierRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldNullRoot : undefined;
  }

  @FieldResolver()
  async nullifierRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newNullRoot : undefined;
  }

  @FieldResolver()
  async oldDataRootsRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRootsRoot : undefined;
  }

  @FieldResolver()
  async dataRootsRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newDataRootsRoot : undefined;
  }

  @FieldResolver(() => Int)
  async numTxs(@Root() { rollupProof: { txs } }: RollupDao) {
    return txs.length;
  }

  @FieldResolver(() => Int)
  async txs(@Root() { rollupProof }: RollupDao) {
    return rollupProof?.txs || [];
  }

  @Query(() => Int)
  async totalRollups() {
    return this.rollupDb.getNumSettledRollups();
  }
}

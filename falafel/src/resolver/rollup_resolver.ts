import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { RollupDao } from '../entity';
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
  rollup(@Arg('id', () => Int) id: number) {
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
    return ethTxHash?.toBuffer();
  }

  @FieldResolver()
  mined(@Root() { mined }: RollupDao) {
    return mined;
  }

  @FieldResolver()
  oldDataRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.oldDataRoot : undefined;
  }

  @FieldResolver()
  proofData(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    return encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
  }

  @FieldResolver()
  dataRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.newDataRoot : undefined;
  }

  @FieldResolver()
  oldNullifierRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.oldNullRoot : undefined;
  }

  @FieldResolver()
  nullifierRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.newNullRoot : undefined;
  }

  @FieldResolver()
  oldDataRootsRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.oldDataRootsRoot : undefined;
  }

  @FieldResolver()
  dataRootsRoot(@Root() { rollupProof: { encodedProofData } }: RollupDao) {
    const rollup = encodedProofData ? RollupProofData.decode(encodedProofData) : undefined;
    return rollup ? rollup.newDataRootsRoot : undefined;
  }

  @FieldResolver(() => Int)
  numTxs(@Root() { rollupProof: { txs } }: RollupDao) {
    return txs.length;
  }

  @FieldResolver(() => Int)
  txs(@Root() { rollupProof }: RollupDao) {
    return rollupProof?.txs || [];
  }

  @Query(() => Int)
  totalRollups() {
    return this.rollupDb.getNumSettledRollups();
  }
}

import { RollupProofData } from 'barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Repository, Connection } from 'typeorm';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { getQuery, pickOne, FieldAliases } from './query_builder';
import { RollupsArgs, SearchRollupsArgs, RollupType } from './rollup_type';
import { CachedRollupDb } from '../rollup_db';

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupProofDao>;
  private readonly rollupTxRep: Repository<RollupDao>;
  private rollupDb: CachedRollupDb;

  private fieldAliases: FieldAliases = {};

  constructor(@Inject('rollupDb') rollupDb: CachedRollupDb, @Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupProofDao);
    this.rollupTxRep = connection.getRepository(RollupDao);
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

  @Query(() => [RollupType!])
  async searchRollups(@Args() { where, ...args }: SearchRollupsArgs) {
    return getQuery(
      this.rollupRep,
      { where: { ...pickOne(where || {}), rollup_not_null: true }, ...args }, // eslint-disable-line camelcase
    ).getMany();
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
  async txs(@Root() { rollupProof: { txs } }: RollupDao) {
    return txs;
  }

  @Query(() => Int)
  async totalRollups() {
    return this.rollupDb.getNumSettledRollups();
  }
}

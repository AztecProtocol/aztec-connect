import { RollupProofData } from 'barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { RollupProofDao } from '../entity/rollup_proof';
import { RollupDao } from '../entity/rollup';
import { FieldAliases, getQuery, pickOne } from './query_builder';
import { RollupsArgs, RollupType } from './rollup_type';
import { HexString } from './scalar_type';

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupProofDao>;
  private readonly rollupTxRep: Repository<RollupDao>;

  private fieldAliases: FieldAliases = {};

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupProofDao);
    this.rollupTxRep = connection.getRepository(RollupDao);

    this.fieldAliases.hash = 'id';
    ['id', 'dataRoot', 'ethTxHash', 'mined'].forEach(field => {
      this.fieldAliases[field] = `rollup.${field}`;
    });
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('hash', () => HexString, { nullable: true }) hash?: Buffer,
  ) {
    return getQuery(
      this.rollupRep,
      {
        where: { ...pickOne({ id, hash }), rollup_not_null: true }, // eslint-disable-line camelcase
      },
      this.fieldAliases,
      ['rollup', 'txs'],
    ).getOne();
  }

  @Query(() => [RollupType!])
  async rollups(@Args() { where, ...args }: RollupsArgs) {
    return getQuery(
      this.rollupRep,
      { where: { ...pickOne(where || {}), rollup_not_null: true }, ...args }, // eslint-disable-line camelcase
      this.fieldAliases,
      ['rollup', 'txs'],
    ).getMany();
  }

  @FieldResolver()
  async id(@Root() { rollup: { id } }: RollupProofDao) {
    return id;
  }

  @FieldResolver()
  async hash(@Root() { id }: RollupProofDao) {
    return id;
  }

  @FieldResolver()
  async ethTxHash(@Root() { rollup: { ethTxHash } }: RollupProofDao) {
    return ethTxHash;
  }

  @FieldResolver()
  async mined(@Root() { rollup: { mined } }: RollupProofDao) {
    return mined;
  }

  @FieldResolver()
  async oldDataRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRoot : undefined;
  }

  @FieldResolver()
  async dataRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newDataRoot : undefined;
  }

  @FieldResolver()
  async oldNullifierRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldNullRoot : undefined;
  }

  @FieldResolver()
  async nullifierRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newNullRoot : undefined;
  }

  @FieldResolver()
  async oldDataRootsRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRootsRoot : undefined;
  }

  @FieldResolver()
  async dataRootsRoot(@Root() { proofData }: RollupProofDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newDataRootsRoot : undefined;
  }

  @FieldResolver(() => Int)
  async numTxs(@Root() { txs }: RollupProofDao) {
    return txs.length;
  }

  @Query(() => Int)
  async totalRollups() {
    return getQuery(this.rollupTxRep, { where: { mined_not_null: true } }).getCount(); // eslint-disable-line camelcase
  }
}

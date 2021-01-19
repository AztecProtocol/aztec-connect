import { RollupProofData } from 'barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { FieldAliases, getQuery } from './query_builder';
import { RollupType, RollupsArgs, RollupCountArgs } from './rollup_type';
import { HexString } from './scalar_type';

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupProofDao>;
  private readonly rollupTxRep: Repository<TxDao>;
  private fieldAliases: FieldAliases = {};

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupProofDao);
    this.rollupTxRep = connection.getRepository(TxDao);
    this.fieldAliases.hash = 'id';
    ['id', 'dataRoot', 'ethTxHash', 'mined'].forEach(field => {
      this.fieldAliases[field] = `rollup.${field}`;
    });
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('hash', () => HexString, { nullable: true }) hash?: Buffer,
    @Arg('dataRoot', () => HexString, { nullable: true }) dataRoot?: Buffer,
    @Arg('ethTxHash', () => HexString, { nullable: true }) ethTxHash?: Buffer,
  ) {
    return getQuery(
      this.rollupRep,
      {
        where: { id, hash, dataRoot, ethTxHash, rollup_not_null: true }, // eslint-disable-line camelcase
      },
      this.fieldAliases,
      ['rollup', 'txs'],
    ).getOne();
  }

  @Query(() => [RollupType!])
  async rollups(@Args() { where, ...args }: RollupsArgs) {
    return getQuery(
      this.rollupRep,
      { where: { ...where, rollup_not_null: true }, ...args }, // eslint-disable-line camelcase
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
  async totalRollups(@Args() { where }: RollupCountArgs) {
    return getQuery(this.rollupRep, { where: { ...where, rollup_not_null: true } }).getCount(); // eslint-disable-line camelcase
  }
}

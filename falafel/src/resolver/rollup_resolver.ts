import { RollupStatus } from 'barretenberg/rollup_provider';
import { Max } from 'class-validator';
import { Arg, Args, ArgsType, Field, FieldResolver, Int, InputType, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { buildFilters, MAX_COUNT, Sort, toFindConditions } from './filter';
import { RollupType, fromRollupDao } from './rollup_type';
import { toTxType } from './tx_type';

@InputType()
export class RollupFilter {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => Int, { nullable: true })
  id_gt?: number;

  @Field(() => Int, { nullable: true })
  id_gte?: number;

  @Field(() => Int, { nullable: true })
  id_lt?: number;

  @Field(() => Int, { nullable: true })
  id_lte?: number;

  @Field(() => Int, { nullable: true })
  id_not?: number;

  @Field(() => Int, { nullable: true })
  ethBlock?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_gt?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_gte?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_lt?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_lte?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_not?: number;

  @Field({ nullable: true })
  dataRoot?: string;

  @Field({ nullable: true })
  dataRoot_not?: string;

  @Field({ nullable: true })
  ethTxHash?: string;

  @Field({ nullable: true })
  ethTxHash_not?: string;

  @Field({ nullable: true })
  status?: RollupStatus;

  @Field({ nullable: true })
  status_not?: RollupStatus;

  @Field({ nullable: true })
  created?: Date;

  @Field({ nullable: true })
  created_gt?: Date;

  @Field({ nullable: true })
  created_gte?: Date;

  @Field({ nullable: true })
  created_lt?: Date;

  @Field({ nullable: true })
  created_lte?: Date;

  @Field({ nullable: true })
  created_not?: Date;
}

@InputType()
class RollupOrder {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  ethBlock?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class RollupsArgs {
  @Field(() => RollupFilter, { nullable: true })
  where?: RollupFilter;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: RollupOrder;
}

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupDao>;
  private readonly rollupTxRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupDao);
    this.rollupTxRep = connection.getRepository(TxDao);
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('dataRoot', { nullable: true }) dataRoot?: string,
    @Arg('ethBlock', () => Int, { nullable: true }) ethBlock?: number,
    @Arg('ethTxHash', { nullable: true }) ethTxHash?: string,
  ) {
    const filters = buildFilters(
      [
        { field: 'id', type: 'Int' },
        { field: 'dataRoot', type: 'Buffer' },
        { field: 'ethBlock', type: 'Int' },
        { field: 'ethTxHash', type: 'Buffer' },
      ],
      { id, dataRoot, ethBlock, ethTxHash },
    );
    const rollup = filters.length ? await this.rollupRep.findOne(toFindConditions(filters)) : undefined;
    return rollup ? fromRollupDao(rollup) : undefined;
  }

  @Query(() => [RollupType!])
  async rollups(@Args() { where, take, skip, order }: RollupsArgs) {
    const filters = buildFilters(
      [
        { field: 'id', type: 'Int' },
        { field: 'ethBlock', type: 'Int' },
        { field: 'dataRoot', type: 'Buffer' },
        { field: 'ethTxHash', type: 'Buffer' },
        { field: 'status', type: 'String' },
        { field: 'created', type: 'Date' },
      ],
      where || {},
    );
    if (filters.length) {
      return (
        await this.rollupRep.find({
          where: toFindConditions(filters),
          order,
          skip,
          take,
        })
      ).map(fromRollupDao);
    }

    return (
      await this.rollupRep.find({
        order,
        skip,
        take,
      })
    ).map(fromRollupDao);
  }

  @FieldResolver()
  async oldDataRoot(@Root() { proofData }: RollupType) {
    return proofData ? proofData.slice(3 * 32 * 2, (3 * 32 + 32) * 2) : undefined;
  }

  @FieldResolver()
  async oldNullifierRoot(@Root() { proofData }: RollupType) {
    return proofData ? proofData.slice(5 * 32 * 2, (5 * 32 + 32) * 2) : undefined;
  }

  @FieldResolver()
  async nullifierRoot(@Root() { proofData }: RollupType) {
    return proofData ? proofData.slice(6 * 32 * 2, (6 * 32 + 32) * 2) : undefined;
  }

  @FieldResolver()
  async oldDataRootsRoot(@Root() { proofData }: RollupType) {
    return proofData ? proofData.slice(7 * 32 * 2, (7 * 32 + 32) * 2) : undefined;
  }

  @FieldResolver()
  async dataRootsRoot(@Root() { proofData }: RollupType) {
    return proofData ? proofData.slice(8 * 32 * 2, (8 * 32 + 32) * 2) : undefined;
  }

  @FieldResolver(() => Int)
  async numTxs(@Root() rollup: RollupType) {
    const { proofData } = rollup;
    if (proofData) {
      return Buffer.from(proofData.slice((9 * 32 + 28) * 2, 10 * 32 * 2), 'hex').readUInt32BE(0);
    }

    const txs = await this.rollupTxRep.find({
      where: { rollup: rollup.id },
    });
    return txs.length;
  }

  @FieldResolver()
  async txs(@Root() rollup: RollupType) {
    const txs = await this.rollupTxRep.find({
      where: { rollup: rollup.id },
    });
    return txs.map(toTxType);
  }

  @Query(() => Int)
  async totalRollups(@Arg('status', { nullable: true }) status?: RollupStatus) {
    if (!status) {
      return this.rollupRep.count();
    }
    return this.rollupRep.count({ status });
  }
}

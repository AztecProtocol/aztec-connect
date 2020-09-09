import { Max } from 'class-validator';
import { Arg, Args, ArgsType, Field, FieldResolver, Int, InputType, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository, Not } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { buildFilters, MAX_COUNT, Sort, toFindConditions } from './filter';
import { toRollupType } from './rollup_type';
import { TxType, toTxType } from './tx_type';

@InputType()
export class TxFilter {
  @Field({ nullable: true })
  txId?: string;

  @Field({ nullable: true })
  txId_not?: string;

  @Field(() => Int, { nullable: true })
  rollup?: number;

  @Field(() => Int, { nullable: true })
  rollup_not?: number;
}

@InputType()
class TxOrder {
  @Field({ nullable: true })
  txId?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class TxsArgs {
  @Field(() => TxFilter, { nullable: true })
  where?: TxFilter;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: TxOrder;
}

@Resolver(() => TxType)
export class TxResolver {
  private readonly rollupRep: Repository<RollupDao>;
  private readonly txRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupDao);
    this.txRep = connection.getRepository(TxDao);
  }

  @Query(() => TxType, { nullable: true })
  async tx(@Arg('txId') txId: string) {
    const tx = await this.txRep.findOne({ txId: Buffer.from(txId, 'hex') });
    return tx ? toTxType(tx) : undefined;
  }

  @Query(() => [TxType!])
  async txs(@Args() { where, take, skip, order }: TxsArgs) {
    const filters = buildFilters(
      [
        { field: 'txId', type: 'String' },
        { field: 'rollup', type: 'Int' },
      ],
      where || {},
    );
    if (filters.length) {
      return (
        await this.txRep.find({
          where: toFindConditions(filters),
          order,
          take,
          skip,
        })
      ).map(toTxType);
    }

    return (
      await this.txRep.find({
        order,
        take,
        skip,
      })
    ).map(toTxType);
  }

  @Query(() => Int)
  async totalTxs() {
    const pendingTxs = await this.totalPendingTxs();
    const totalTxs = await this.txRep.count();
    return totalTxs - pendingTxs;
  }

  @Query(() => Int)
  async totalPendingTxs() {
    const pendingRollups = await this.rollupRep.find({ where: { status: Not('SETTLED') }, relations: ['txs'] });
    return pendingRollups.reduce((accum, { txs }) => accum + txs.length, 0);
  }

  @FieldResolver({ nullable: true })
  async rollup(@Root() tx: TxType) {
    const { rollup } =
      (await this.txRep.findOne({ txId: Buffer.from(tx.txId, 'hex') }, { relations: ['rollup'] })) || {};
    return rollup ? toRollupType(rollup) : undefined;
  }
}

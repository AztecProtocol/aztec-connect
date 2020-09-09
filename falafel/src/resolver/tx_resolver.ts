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
  id?: string;
}

@InputType()
class TxOrderBy {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class TxsArgs {
  @Field(() => TxFilter, { nullable: true })
  where?: TxFilter;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  count?: number;

  @Field({ defaultValue: { id: 'DESC' } })
  order_by?: TxOrderBy;
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
  async tx(@Arg('id') id: string) {
    const tx = await this.txRep.findOne({ txId: Buffer.from(id, 'hex') });
    return tx ? toTxType(tx) : undefined;
  }

  @Query(() => [TxType!])
  async txs(@Args() { where, count, order_by }: TxsArgs) {
    const filters = buildFilters([{ field: 'id', type: 'String' }], where || {});
    if (filters.length) {
      return (
        await this.txRep.find({
          where: toFindConditions(filters),
          order: order_by,
          take: count,
        })
      ).map(toTxType);
    }

    return (
      await this.txRep.find({
        order: order_by,
        take: count,
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

  @FieldResolver()
  async rollup(@Root() tx: TxType) {
    const { rollup } = (await this.txRep.findOne({ txId: Buffer.from(tx.id, 'hex') }, { relations: ['rollup'] })) || {};
    return rollup ? toRollupType(rollup) : undefined;
  }
}

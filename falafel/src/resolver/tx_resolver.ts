import { Max } from 'class-validator';
import { Arg, Args, ArgsType, Field, FieldResolver, InputType, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { TxDao } from '../entity/tx';
import { buildFilters, MAX_COUNT, Sort } from './filter';
import { toRollupType } from './rollup_type';
import { TxType, toTxType } from './tx_type';

@InputType()
export class TxFilter {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  id_gt?: number;

  @Field({ nullable: true })
  id_gte?: number;

  @Field({ nullable: true })
  id_lt?: number;

  @Field({ nullable: true })
  id_lte?: number;
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

  @Field({ defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  count?: number;

  @Field({ defaultValue: { id: 'DESC' } })
  order_by?: TxOrderBy;
}

@Resolver(of => TxType)
export class TxResolver {
  private readonly txRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.txRep = connection.getRepository(TxDao);
  }

  @Query(() => TxType)
  async tx(@Arg('id') id: string) {
    const tx = await this.txRep.findOne({ txId: Buffer.from(id, 'hex') });
    return tx ? toTxType(tx) : undefined;
  }

  @Query(() => [TxType])
  async txs(@Args() { where, count, order_by }: TxsArgs) {
    const filters = buildFilters([{ field: 'id', type: 'Int' }], where || {});
    if (filters.length) {
      return (
        await this.txRep.find({
          where: filters.reduce(
            (accum, { field, filter }) => ({
              ...accum,
              [field]: filter,
            }),
            {} as any,
          ),
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

  @FieldResolver()
  async rollup(@Root() tx: TxType) {
    const { rollup } = (await this.txRep.findOne({ txId: Buffer.from(tx.id, 'hex') }, { relations: ['rollup'] })) || {};
    return rollup ? toRollupType(rollup) : undefined;
  }
}

import { Max } from 'class-validator';
import { Arg, Args, ArgsType, Field, Int, InputType, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { buildFilters, MAX_COUNT, Sort, toFindConditions } from './filter';
import { BlockType, toBlockType } from './block_type';

@InputType()
export class BlockFilter {
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

  @Field({ nullable: true })
  txHash?: string;

  @Field({ nullable: true })
  txHash_not?: string;

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
class BlockOrder {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class BlocksArgs {
  @Field(() => BlockFilter, { nullable: true })
  where?: BlockFilter;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: BlockOrder;
}

@Resolver(() => BlockType)
export class BlockResolver {
  private readonly blockRep: Repository<BlockDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.blockRep = connection.getRepository(BlockDao);
  }

  @Query(() => BlockType, { nullable: true })
  async block(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('txHash', { nullable: true }) txHash?: string,
  ) {
    const filters = buildFilters(
      [
        { field: 'id', type: 'Int' },
        { field: 'txHash', type: 'Buffer' },
      ],
      { id, txHash },
    );
    const block = filters.length ? await this.blockRep.findOne(toFindConditions(filters)) : undefined;
    return block ? toBlockType(block) : undefined;
  }

  @Query(() => [BlockType!])
  async blocks(@Args() { where, take, skip, order }: BlocksArgs) {
    const filters = buildFilters(
      [
        { field: 'id', type: 'Int' },
        { field: 'txHash', type: 'Buffer' },
        { field: 'created', type: 'Date' },
      ],
      where || {},
    );
    if (filters.length) {
      return (
        await this.blockRep.find({
          where: toFindConditions(filters),
          order,
          take,
          skip,
        })
      ).map(toBlockType);
    }

    return (
      await this.blockRep.find({
        order,
        take,
        skip,
      })
    ).map(toBlockType);
  }

  @Query(() => Int)
  async totalBlocks() {
    return this.blockRep.count();
  }
}

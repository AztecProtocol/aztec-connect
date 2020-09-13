import { Max } from 'class-validator';
import { Arg, Args, ArgsType, Field, Int, InputType, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { BlockType, fromBlockDao } from './block_type';
import { getQuery, MAX_COUNT, Sort } from './query_builder';

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
    const query = getQuery(
      this.blockRep,
      [
        { field: 'id', type: 'Int' },
        { field: 'txHash', type: 'Buffer' },
      ],
      { where: { id, txHash } },
    );
    const block = await query.getOne();
    return block ? fromBlockDao(block) : undefined;
  }

  @Query(() => [BlockType!])
  async blocks(@Args() args: BlocksArgs) {
    const query = getQuery(
      this.blockRep,
      [
        { field: 'id', type: 'Int' },
        { field: 'txHash', type: 'Buffer' },
        { field: 'created', type: 'Date' },
      ],
      args,
    );
    return (await query.getMany()).map(fromBlockDao);
  }

  @Query(() => Int)
  async totalBlocks() {
    return this.blockRep.count();
  }
}

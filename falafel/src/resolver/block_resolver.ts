import { Arg, Args, Int, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { BlockType, BlocksArgs, BlockCountArgs } from './block_type';
import { getQuery } from './query_builder';
import { HexString } from './scalar_type';

@Resolver(() => BlockType)
export class BlockResolver {
  private readonly blockRep: Repository<BlockDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.blockRep = connection.getRepository(BlockDao);
  }

  @Query(() => BlockType, { nullable: true })
  async block(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('txHash', () => HexString, { nullable: true }) txHash?: Buffer,
    @Arg('rollupId', () => Int, { nullable: true }) rollupId?: number,
  ) {
    return getQuery(this.blockRep, { where: { id, txHash, rollupId } }).getOne();
  }

  @Query(() => [BlockType!])
  async blocks(@Args() args: BlocksArgs) {
    return getQuery(this.blockRep, args).getMany();
  }

  @Query(() => Int)
  async totalBlocks(@Args() args: BlockCountArgs) {
    return getQuery(this.blockRep, args).getCount();
  }
}

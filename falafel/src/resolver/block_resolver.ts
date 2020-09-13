import { Arg, Args, Int, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { BlockType, BlocksArgs } from './block_type';
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
    @Arg('txHash', () => HexString, { nullable: true }) txHash?: string,
  ) {
    const query = getQuery(this.blockRep, { where: { id, txHash } });
    return query.getOne();
  }

  @Query(() => [BlockType!])
  async blocks(@Args() args: BlocksArgs) {
    const query = getQuery(this.blockRep, args);
    return query.getMany();
  }

  @Query(() => Int)
  async totalBlocks() {
    return this.blockRep.count();
  }
}

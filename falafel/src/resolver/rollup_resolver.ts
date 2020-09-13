import { RollupStatus } from 'barretenberg/rollup_provider';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { getQuery } from './query_builder';
import { RollupType, RollupsArgs } from './rollup_type';
import { HexString } from './scalar_type';

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupDao>;
  private readonly rollupTxRep: Repository<TxDao>;
  private readonly blockRep: Repository<BlockDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupDao);
    this.rollupTxRep = connection.getRepository(TxDao);
    this.blockRep = connection.getRepository(BlockDao);
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('dataRoot', () => HexString, { nullable: true }) dataRoot?: string,
    @Arg('ethBlock', () => Int, { nullable: true }) ethBlock?: number,
    @Arg('ethTxHash', () => HexString, { nullable: true }) ethTxHash?: string,
  ) {
    const query = getQuery(this.rollupRep, {
      where: { id, dataRoot, ethBlock, ethTxHash },
    });
    return query.getOne();
  }

  @Query(() => [RollupType!])
  async rollups(@Args() args: RollupsArgs) {
    const query = getQuery(this.rollupRep, args);
    return query.getMany();
  }

  @FieldResolver()
  async oldDataRoot(@Root() { proofData }: RollupDao) {
    return proofData ? proofData.slice(3 * 32, 3 * 32 + 32) : undefined;
  }

  @FieldResolver()
  async oldNullifierRoot(@Root() { proofData }: RollupDao) {
    return proofData ? proofData.slice(5 * 32, 5 * 32 + 32) : undefined;
  }

  @FieldResolver()
  async nullifierRoot(@Root() { proofData }: RollupDao) {
    return proofData ? proofData.slice(6 * 32, 6 * 32 + 32) : undefined;
  }

  @FieldResolver()
  async oldDataRootsRoot(@Root() { proofData }: RollupDao) {
    return proofData ? proofData.slice(7 * 32, 7 * 32 + 32) : undefined;
  }

  @FieldResolver()
  async dataRootsRoot(@Root() { proofData }: RollupDao) {
    return proofData ? proofData.slice(8 * 32, 8 * 32 + 32) : undefined;
  }

  @FieldResolver(() => Int)
  async numTxs(@Root() rollup: RollupDao) {
    const { proofData } = rollup;
    if (proofData) {
      return proofData.slice(9 * 32 + 28, 10 * 32).readUInt32BE(0);
    }

    const txs = await this.rollupTxRep.find({
      where: { rollup: rollup.id },
    });
    return txs.length;
  }

  @FieldResolver()
  async txs(@Root() rollup: RollupDao) {
    return this.rollupTxRep.find({
      where: { rollup: rollup.id },
    });
  }

  @FieldResolver()
  async block(@Root() { ethBlock }: RollupDao) {
    return ethBlock
      ? this.blockRep.findOne({
          where: { id: ethBlock },
        })
      : undefined;
  }

  @Query(() => Int)
  async totalRollups(@Arg('status', { nullable: true }) status?: RollupStatus) {
    if (!status) {
      return this.rollupRep.count();
    }
    return this.rollupRep.count({ status });
  }
}

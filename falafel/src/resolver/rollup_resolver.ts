import { RollupStatus } from 'barretenberg/rollup_provider';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { fromBlockDao } from './block_type';
import { getQuery } from './query_builder';
import { RollupType, RollupsArgs, fromRollupDao } from './rollup_type';
import { HexString } from './scalar_type';
import { fromTxDao } from './tx_type';

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
    const rollup = await query.getOne();
    return rollup ? fromRollupDao(rollup) : undefined;
  }

  @Query(() => [RollupType!])
  async rollups(@Args() args: RollupsArgs) {
    const query = getQuery(this.rollupRep, args);
    return (await query.getMany()).map(fromRollupDao);
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
    return txs.map(fromTxDao);
  }

  @FieldResolver()
  async block(@Root() { ethBlock }: RollupType) {
    const block = ethBlock
      ? await this.blockRep.findOne({
          where: { id: ethBlock },
        })
      : undefined;
    return block ? fromBlockDao(block) : undefined;
  }

  @Query(() => Int)
  async totalRollups(@Arg('status', { nullable: true }) status?: RollupStatus) {
    if (!status) {
      return this.rollupRep.count();
    }
    return this.rollupRep.count({ status });
  }
}

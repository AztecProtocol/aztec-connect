import { RollupProofData } from 'barretenberg/rollup_proof';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';
import { getQuery } from './query_builder';
import { RollupType, RollupsArgs, RollupCountArgs } from './rollup_type';
import { HexString } from './scalar_type';

@Resolver(() => RollupType)
export class RollupResolver {
  private readonly rollupRep: Repository<RollupProofDao>;
  private readonly rollupTxRep: Repository<TxDao>;
  private readonly blockRep: Repository<BlockDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupProofDao);
    this.rollupTxRep = connection.getRepository(TxDao);
    this.blockRep = connection.getRepository(BlockDao);
  }

  @Query(() => RollupType, { nullable: true })
  async rollup(
    @Arg('id', () => Int, { nullable: true }) id?: number,
    @Arg('hash', () => HexString, { nullable: true }) hash?: Buffer,
    @Arg('dataRoot', () => HexString, { nullable: true }) dataRoot?: Buffer,
    @Arg('ethBlock', () => Int, { nullable: true }) ethBlock?: number,
    @Arg('ethTxHash', () => HexString, { nullable: true }) ethTxHash?: Buffer,
  ) {
    return getQuery(this.rollupRep, {
      where: { id, hash, dataRoot, ethBlock, ethTxHash },
    }).getOne();
  }

  @Query(() => [RollupType!])
  async rollups(@Args() args: RollupsArgs) {
    return getQuery(this.rollupRep, args).getMany();
  }

  @FieldResolver()
  async oldDataRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRoot : undefined;
  }

  @FieldResolver()
  async oldNullifierRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldNullRoot : undefined;
  }

  @FieldResolver()
  async nullifierRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newNullRoot : undefined;
  }

  @FieldResolver()
  async oldDataRootsRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.oldDataRootsRoot : undefined;
  }

  @FieldResolver()
  async dataRootsRoot(@Root() { rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    return rollup ? rollup.newDataRootsRoot : undefined;
  }

  @FieldResolver(() => Int)
  async numTxs(@Root() { id, rollupProof: { proofData } }: RollupDao) {
    const rollup = proofData ? RollupProofData.fromBuffer(proofData) : undefined;
    if (rollup) {
      return rollup.numTxs;
    }

    const txs = await this.rollupTxRep.find({
      where: { rollup: id },
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
  async block(@Root() { ethTxHash }: RollupDao) {
    return ethTxHash
      ? this.blockRep.findOne({
          where: { txHash: ethTxHash },
        })
      : undefined;
  }

  @Query(() => Int)
  async totalRollups(@Args() args: RollupCountArgs) {
    return getQuery(this.rollupRep, args).getCount();
  }
}

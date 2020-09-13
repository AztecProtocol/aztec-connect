import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository, Not } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { getQuery } from './query_builder';
import { fromRollupDao } from './rollup_type';
import { HexString } from './scalar_type';
import { TxType, TxsArgs, fromTxDao } from './tx_type';

@Resolver(() => TxType)
export class TxResolver {
  private readonly rollupRep: Repository<RollupDao>;
  private readonly txRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.rollupRep = connection.getRepository(RollupDao);
    this.txRep = connection.getRepository(TxDao);
  }

  @Query(() => TxType, { nullable: true })
  async tx(@Arg('txId', () => HexString) txId: string) {
    const tx = await this.txRep.findOne({ txId: Buffer.from(txId, 'hex') });
    return tx ? fromTxDao(tx) : undefined;
  }

  @Query(() => [TxType!])
  async txs(@Args() args: TxsArgs) {
    const query = getQuery(this.txRep, ['txId', 'rollup'], args);

    return (await query.getMany()).map(fromTxDao);
  }

  @FieldResolver(() => Int)
  async proofId(@Root() { proofData }: TxType) {
    return Buffer.from(proofData.slice(28 * 2, 32 * 2), 'hex').readUInt32BE(0);
  }

  @FieldResolver()
  async publicInput(@Root() { proofData }: TxType) {
    return proofData.slice(1 * 32 * 2, 2 * 32 * 2);
  }

  @FieldResolver()
  async publicOutput(@Root() { proofData }: TxType) {
    return proofData.slice(2 * 32 * 2, 3 * 32 * 2);
  }

  @FieldResolver()
  async newNote1(@Root() { proofData }: TxType) {
    return proofData.slice(3 * 32 * 2, 5 * 32 * 2);
  }

  @FieldResolver()
  async newNote2(@Root() { proofData }: TxType) {
    return proofData.slice(5 * 32 * 2, 7 * 32 * 2);
  }

  @FieldResolver()
  async nullifier1(@Root() { proofData }: TxType) {
    return proofData.slice(7 * 32 * 2, 8 * 32 * 2);
  }

  @FieldResolver()
  async nullifier2(@Root() { proofData }: TxType) {
    return proofData.slice(8 * 32 * 2, 9 * 32 * 2);
  }

  @FieldResolver()
  async inputOwner(@Root() { proofData }: TxType) {
    return proofData.slice((9 * 32 + 12) * 2, 10 * 32 * 2);
  }

  @FieldResolver()
  async outputOwner(@Root() { proofData }: TxType) {
    return proofData.slice((10 * 32 + 12) * 2, 11 * 32 * 2);
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
    return rollup ? fromRollupDao(rollup) : undefined;
  }
}

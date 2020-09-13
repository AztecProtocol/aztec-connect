import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository, Not } from 'typeorm';
import { RollupDao } from '../entity/rollup';
import { TxDao } from '../entity/tx';
import { getQuery } from './query_builder';
import { HexString } from './scalar_type';
import { TxType, TxsArgs } from './tx_type';

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
    return this.txRep.findOne({ txId: Buffer.from(txId, 'hex') });
  }

  @Query(() => [TxType!])
  async txs(@Args() args: TxsArgs) {
    return getQuery(this.txRep, args).getMany();
  }

  @FieldResolver(() => Int)
  async proofId(@Root() { proofData }: TxDao) {
    return proofData.slice(28, 32).readUInt32BE(0);
  }

  @FieldResolver()
  async publicInput(@Root() { proofData }: TxDao) {
    return proofData.slice(1 * 32, 2 * 32);
  }

  @FieldResolver()
  async publicOutput(@Root() { proofData }: TxDao) {
    return proofData.slice(2 * 32, 3 * 32);
  }

  @FieldResolver()
  async newNote1(@Root() { proofData }: TxDao) {
    return proofData.slice(3 * 32, 5 * 32);
  }

  @FieldResolver()
  async newNote2(@Root() { proofData }: TxDao) {
    return proofData.slice(5 * 32, 7 * 32);
  }

  @FieldResolver()
  async nullifier1(@Root() { proofData }: TxDao) {
    return proofData.slice(7 * 32, 8 * 32);
  }

  @FieldResolver()
  async nullifier2(@Root() { proofData }: TxDao) {
    return proofData.slice(8 * 32, 9 * 32);
  }

  @FieldResolver()
  async inputOwner(@Root() { proofData }: TxDao) {
    return proofData.slice(9 * 32 + 12, 10 * 32);
  }

  @FieldResolver()
  async outputOwner(@Root() { proofData }: TxDao) {
    return proofData.slice(10 * 32 + 12, 11 * 32);
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
  async rollup(@Root() tx: TxDao) {
    const { rollup } = (await this.txRep.findOne({ txId: tx.txId }, { relations: ['rollup'] })) || {};
    return rollup;
  }
}

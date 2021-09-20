import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, LessThanOrEqual, Repository } from 'typeorm';
import { TxDao } from '../entity/tx';
import { CachedRollupDb } from '../rollup_db';
import { getQuery, pickOne } from './query_builder';
import { HexString, toSQLIteDateTime } from './scalar_type';
import { TxsArgs, TxType } from './tx_type';

@Resolver(() => TxType)
export class TxResolver {
  private readonly txRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection, @Inject('rollupDb') private rollupDb: CachedRollupDb) {
    this.txRep = connection.getRepository(TxDao);
  }

  @Query(() => TxType, { nullable: true })
  async tx(@Arg('id', () => HexString) id: Buffer) {
    return this.txRep.findOne({ id }, { relations: ['rollupProof', 'rollupProof.rollup'] });
  }

  @Query(() => [TxType!])
  async txs(@Args() { where, ...args }: TxsArgs) {
    return getQuery(this.txRep, { where: where ? pickOne(where) : undefined, ...args }).getMany();
  }

  @FieldResolver(() => Int)
  async txNo(@Root() { created }: TxDao) {
    return this.txRep.count({ created: LessThanOrEqual(toSQLIteDateTime(created)) });
  }

  @FieldResolver(() => Int)
  async proofId(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.proofId;
  }

  @FieldResolver()
  async publicInput(@Root() { proofData }: TxDao) {
    const { proofId, publicValue } = new ProofData(proofData);
    return proofId === ProofId.DEPOSIT ? publicValue : Buffer.alloc(32);
  }

  @FieldResolver()
  async publicOutput(@Root() { proofData }: TxDao) {
    const { proofId, publicValue } = new ProofData(proofData);
    return proofId === ProofId.WITHDRAW ? publicValue : Buffer.alloc(32);
  }

  @FieldResolver()
  async assetId(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.assetId;
  }

  @FieldResolver()
  async newNote1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.noteCommitment1;
  }

  @FieldResolver()
  async newNote2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.noteCommitment2;
  }

  @FieldResolver()
  async nullifier1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.nullifier1;
  }

  @FieldResolver()
  async nullifier2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.nullifier2;
  }

  @FieldResolver()
  async inputOwner(@Root() { proofData }: TxDao) {
    const { proofId, publicOwner } = new ProofData(proofData);
    return proofId === ProofId.DEPOSIT ? publicOwner : Buffer.alloc(32);
  }

  @FieldResolver()
  async outputOwner(@Root() { proofData }: TxDao) {
    const { proofId, publicOwner } = new ProofData(proofData);
    return proofId === ProofId.WITHDRAW ? publicOwner : Buffer.alloc(32);
  }

  @FieldResolver()
  async rollup(@Root() { rollupProof }: TxDao) {
    return rollupProof?.rollup;
  }

  @Query(() => Int)
  async totalTxs() {
    return this.rollupDb.getTotalTxCount();
  }
}

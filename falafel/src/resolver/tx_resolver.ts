import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { Arg, Args, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository, LessThanOrEqual } from 'typeorm';
import { TxDao } from '../entity/tx';
import { getQuery } from './query_builder';
import { HexString, toSQLIteDateTime } from './scalar_type';
import { TxType, TxsArgs, TxCountArgs } from './tx_type';

@Resolver(() => TxType)
export class TxResolver {
  private readonly txRep: Repository<TxDao>;

  constructor(@Inject('connection') connection: Connection) {
    this.txRep = connection.getRepository(TxDao);
  }

  @Query(() => TxType, { nullable: true })
  async tx(@Arg('id', () => HexString) id: Buffer) {
    return this.txRep.findOne({ id });
  }

  @Query(() => [TxType!])
  async txs(@Args() args: TxsArgs) {
    return getQuery(this.txRep, args).getMany();
  }

  @FieldResolver(() => Int)
  async txNo(@Root() { created }: TxDao) {
    return this.txRep.count({ created: LessThanOrEqual(toSQLIteDateTime(created)) });
  }

  @FieldResolver(() => Int)
  async proofId(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.proofId;
  }

  @FieldResolver()
  async publicInput(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.publicInput;
  }

  @FieldResolver()
  async publicOutput(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.publicOutput;
  }

  @FieldResolver()
  async newNote1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.newNote1;
  }

  @FieldResolver()
  async newNote2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.newNote2;
  }

  @FieldResolver()
  async nullifier1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.nullifier1;
  }

  @FieldResolver()
  async nullifier2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.nullifier2;
  }

  @FieldResolver()
  async inputOwner(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.inputOwner;
  }

  @FieldResolver()
  async outputOwner(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData, []);
    return joinSplit.outputOwner;
  }

  @FieldResolver({ nullable: true })
  async rollup(@Root() { id }: TxDao) {
    const { rollupProof } = (await getQuery(this.txRep, { where: { id } }, {}, [
      'rollupProof',
      'rollupProof.rollup',
    ]).getOne())!;
    return rollupProof;
  }

  @Query(() => Int)
  async totalTxs(@Args() args: TxCountArgs) {
    return getQuery(this.txRep, args, { rollup: 'rollupProof' }).getCount();
  }
}

import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Arg, FieldResolver, Int, Query, Resolver, Root } from 'type-graphql';
import { Inject } from 'typedi';
import { TxDao } from '../entity';
import { CachedRollupDb } from '../rollup_db';
import { HexString } from './scalar_type';
import { TxType } from './tx_type';

@Resolver(() => TxType)
export class TxResolver {
  constructor(@Inject('rollupDb') private rollupDb: CachedRollupDb) {}

  @Query(() => TxType, { nullable: true })
  async tx(@Arg('id', () => HexString) id: Buffer) {
    return this.rollupDb.getTx(id);
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
    return joinSplit.publicAssetId;
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

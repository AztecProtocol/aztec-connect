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
  tx(@Arg('id', () => HexString) id: Buffer) {
    return this.rollupDb.getTx(id);
  }

  @FieldResolver(() => Int)
  proofId(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.proofId;
  }

  @FieldResolver()
  publicInput(@Root() { proofData }: TxDao) {
    const { proofId, publicValue } = new ProofData(proofData);
    return proofId === ProofId.DEPOSIT ? publicValue : Buffer.alloc(32);
  }

  @FieldResolver()
  publicOutput(@Root() { proofData }: TxDao) {
    const { proofId, publicValue } = new ProofData(proofData);
    return proofId === ProofId.WITHDRAW ? publicValue : Buffer.alloc(32);
  }

  @FieldResolver()
  assetId(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.publicAssetId;
  }

  @FieldResolver()
  newNote1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.noteCommitment1;
  }

  @FieldResolver()
  newNote2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.noteCommitment2;
  }

  @FieldResolver()
  nullifier1(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.nullifier1;
  }

  @FieldResolver()
  nullifier2(@Root() { proofData }: TxDao) {
    const joinSplit = new ProofData(proofData);
    return joinSplit.nullifier2;
  }

  @FieldResolver()
  inputOwner(@Root() { proofData }: TxDao) {
    const { proofId, publicOwner } = new ProofData(proofData);
    return proofId === ProofId.DEPOSIT ? publicOwner : Buffer.alloc(32);
  }

  @FieldResolver()
  outputOwner(@Root() { proofData }: TxDao) {
    const { proofId, publicOwner } = new ProofData(proofData);
    return proofId === ProofId.WITHDRAW ? publicOwner : Buffer.alloc(32);
  }

  @FieldResolver()
  rollup(@Root() { rollupProof }: TxDao) {
    return rollupProof?.rollup;
  }

  @Query(() => Int)
  totalTxs() {
    return this.rollupDb.getTotalTxCount();
  }
}

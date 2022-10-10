import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class CoreAccountTx {
  public readonly proofId = ProofId.ACCOUNT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: GrumpkinAddress,
    public readonly aliasHash: AliasHash,
    public readonly newSpendingPublicKey1: Buffer | undefined,
    public readonly newSpendingPublicKey2: Buffer | undefined,
    public readonly migrated: boolean,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}

export interface CoreAccountTxJson {
  proofId: number;
  txId: string;
  userId: string;
  aliasHash: string;
  newSpendingPublicKey1: string | undefined;
  newSpendingPublicKey2: string | undefined;
  migrated: boolean;
  txRefNo: number;
  created: Date;
  settled?: Date;
}

export const coreAccountTxToJson = (tx: CoreAccountTx): CoreAccountTxJson => ({
  ...tx,
  txId: tx.txId.toString(),
  userId: tx.userId.toString(),
  aliasHash: tx.aliasHash.toString(),
  newSpendingPublicKey1: tx.newSpendingPublicKey1 ? tx.newSpendingPublicKey1.toString('hex') : undefined,
  newSpendingPublicKey2: tx.newSpendingPublicKey2 ? tx.newSpendingPublicKey2.toString('hex') : undefined,
});

export const coreAccountTxFromJson = (json: CoreAccountTxJson) =>
  new CoreAccountTx(
    TxId.fromString(json.txId),
    GrumpkinAddress.fromString(json.userId),
    AliasHash.fromString(json.aliasHash),
    json.newSpendingPublicKey1 ? Buffer.from(json.newSpendingPublicKey1, 'hex') : undefined,
    json.newSpendingPublicKey2 ? Buffer.from(json.newSpendingPublicKey2, 'hex') : undefined,
    json.migrated,
    json.txRefNo,
    json.created,
    json.settled,
  );

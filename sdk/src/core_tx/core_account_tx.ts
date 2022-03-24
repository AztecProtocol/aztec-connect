import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class CoreAccountTx {
  public readonly proofId = ProofId.ACCOUNT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly aliasHash: AliasHash,
    public readonly newSigningPubKey1: Buffer | undefined,
    public readonly newSigningPubKey2: Buffer | undefined,
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
  newSigningPubKey1: string | undefined;
  newSigningPubKey2: string | undefined;
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
  newSigningPubKey1: tx.newSigningPubKey1 ? tx.newSigningPubKey1.toString('hex') : undefined,
  newSigningPubKey2: tx.newSigningPubKey2 ? tx.newSigningPubKey2.toString('hex') : undefined,
});

export const coreAccountTxFromJson = (json: CoreAccountTxJson) =>
  new CoreAccountTx(
    TxId.fromString(json.txId),
    AccountId.fromString(json.userId),
    AliasHash.fromString(json.aliasHash),
    json.newSigningPubKey1 ? Buffer.from(json.newSigningPubKey1, 'hex') : undefined,
    json.newSigningPubKey2 ? Buffer.from(json.newSigningPubKey2, 'hex') : undefined,
    json.migrated,
    json.txRefNo,
    json.created,
    json.settled,
  );

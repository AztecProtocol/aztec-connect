import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export type PaymentProofId = ProofId.DEPOSIT | ProofId.WITHDRAW | ProofId.SEND;

/**
 * Comprises data which will be stored in the user's db.
 * Note: we must be able to restore output notes (etc.) without relying on the db
 * (since local browser data might be cleared, or the user might login from other devices),
 * so crucial data which enables such restoration must not be solely stored here;
 * it must also be contained in either the viewingKey or the offchainTxData.
 */
export class CorePaymentTx {
  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly proofId: PaymentProofId,
    public readonly assetId: number,
    public readonly publicValue: bigint,
    public readonly publicOwner: EthAddress | undefined,
    public readonly privateInput: bigint,
    public readonly recipientPrivateOutput: bigint,
    public readonly senderPrivateOutput: bigint,
    public readonly isRecipient: boolean,
    public readonly isSender: boolean,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}

export interface CorePaymentTxJson {
  txId: string;
  userId: string;
  proofId: PaymentProofId;
  assetId: number;
  publicValue: string;
  publicOwner: string | undefined;
  privateInput: string;
  recipientPrivateOutput: string;
  senderPrivateOutput: string;
  isRecipient: boolean;
  isSender: boolean;
  txRefNo: number;
  created: Date;
  settled?: Date;
}

export const corePaymentTxToJson = (tx: CorePaymentTx): CorePaymentTxJson => ({
  ...tx,
  txId: tx.txId.toString(),
  userId: tx.userId.toString(),
  publicValue: tx.publicValue.toString(),
  publicOwner: tx.publicOwner ? tx.publicOwner.toString() : undefined,
  privateInput: tx.privateInput.toString(),
  recipientPrivateOutput: tx.recipientPrivateOutput.toString(),
  senderPrivateOutput: tx.senderPrivateOutput.toString(),
});

export const corePaymentTxFromJson = (json: CorePaymentTxJson) =>
  new CorePaymentTx(
    TxId.fromString(json.txId),
    AccountId.fromString(json.userId),
    json.proofId,
    json.assetId,
    BigInt(json.publicValue),
    json.publicOwner ? EthAddress.fromString(json.publicOwner) : undefined,
    BigInt(json.privateInput),
    BigInt(json.recipientPrivateOutput),
    BigInt(json.senderPrivateOutput),
    json.isRecipient,
    json.isSender,
    json.txRefNo,
    json.created,
    json.settled,
  );

export const createCorePaymentTxForRecipient = (
  {
    txId,
    userId,
    proofId,
    assetId,
    publicValue,
    publicOwner,
    privateInput,
    recipientPrivateOutput,
    senderPrivateOutput,
    txRefNo,
    created,
    settled,
  }: CorePaymentTx,
  recipient: AccountId,
) =>
  new CorePaymentTx(
    txId,
    recipient,
    proofId,
    assetId,
    publicValue,
    publicOwner,
    privateInput,
    recipientPrivateOutput,
    senderPrivateOutput,
    true,
    recipient.equals(userId),
    txRefNo,
    created,
    settled,
  );

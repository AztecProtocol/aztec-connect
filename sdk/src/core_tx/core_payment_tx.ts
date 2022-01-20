import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxHash } from '@aztec/barretenberg/tx_hash';

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
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly proofId: PaymentProofId,
    public readonly assetId: AssetId,
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

export const createCorePaymentTxForRecipient = (
  {
    txHash,
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
    txHash,
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

import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { FeePayer } from './fee_payer';
import { filterUndefined } from './filter_undefined';

export class TransferController {
  private readonly requireFeePayingTx: boolean;
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientSpendingKeyRequired: boolean,
    public readonly feePayer: FeePayer = { userId, signer: userSigner },
    private readonly core: CoreSdkInterface,
  ) {
    if (!assetValue.value) {
      throw new Error('Value must be greater than 0.');
    }

    this.requireFeePayingTx =
      !!fee.value &&
      (fee.assetId !== assetValue.assetId ||
        !feePayer.userId.equals(userId) ||
        !feePayer.signer.getPublicKey().equals(userSigner.getPublicKey()));
  }

  public async createProof() {
    const { assetId, value } = this.assetValue;
    const privateInput = value + (!this.requireFeePayingTx ? this.fee.value : BigInt(0));
    const txRefNo = this.requireFeePayingTx ? createTxRefNo() : 0;
    const spendingPublicKey = this.userSigner.getPublicKey();

    const proofInput = await this.core.createPaymentProofInput(
      this.userId,
      assetId,
      BigInt(0),
      BigInt(0),
      privateInput,
      value,
      BigInt(0),
      this.recipient,
      this.recipientSpendingKeyRequired,
      undefined,
      spendingPublicKey,
      2,
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createPaymentProof(proofInput, txRefNo);

    if (this.requireFeePayingTx) {
      const { userId, signer } = this.feePayer;
      const spendingPublicKey = signer.getPublicKey();
      const spendingKeyRequired = !spendingPublicKey.equals(userId);
      const feeProofInput = await this.core.createPaymentProofInput(
        userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        userId,
        spendingKeyRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await signer.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
    }
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    this.txIds = await this.core.sendProofs(filterUndefined([this.proofOutput, this.feeProofOutput]));
    return this.txIds[0];
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

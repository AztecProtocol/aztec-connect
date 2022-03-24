import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class TransferController {
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds!: TxId[];

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly to: AccountId,
    private readonly core: CoreSdkInterface,
  ) {}

  public async createProof() {
    const { assetId, value } = this.assetValue;
    const requireFeePayingTx = this.fee.value && this.fee.assetId !== assetId;
    const privateInput = value + (!requireFeePayingTx ? this.fee.value : BigInt(0));
    const txRefNo = requireFeePayingTx ? createTxRefNo() : 0;
    const spendingPublicKey = this.userSigner.getPublicKey();

    const proofInput = await this.core.createPaymentProofInput(
      this.userId,
      assetId,
      BigInt(0),
      BigInt(0),
      privateInput,
      value,
      BigInt(0),
      this.to,
      undefined,
      spendingPublicKey,
      2,
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createPaymentProof(proofInput, txRefNo);

    if (requireFeePayingTx) {
      const feeProofInput = await this.core.createPaymentProofInput(
        this.userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        undefined,
        undefined,
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await this.userSigner.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
    }
  }

  async send() {
    this.txIds = await this.core.sendProofs(filterUndefined([this.proofOutput, this.feeProofOutput]));
    return this.txIds[0];
  }

  async awaitSettlement(timeout?: number) {
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk/index.js';
import { ProofOutput, proofOutputToProofTx } from '../proofs/index.js';
import { Signer } from '../signer/index.js';
import { createTxRefNo } from './create_tx_ref_no.js';

export class AddSpendingKeyController {
  private readonly requireFeePayingTx: boolean;
  private proofOutput?: ProofOutput;
  private feeProofOutputs: ProofOutput[] = [];
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly spendingPublicKey1: GrumpkinAddress,
    public readonly spendingPublicKey2: GrumpkinAddress | undefined,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    this.requireFeePayingTx = !!fee.value;
  }

  public async createProof() {
    const txRefNo = this.requireFeePayingTx ? createTxRefNo() : 0;
    const spendingPublicKey = this.userSigner.getPublicKey();

    if (this.requireFeePayingTx) {
      const spendingKeyRequired = !spendingPublicKey.equals(this.userId);
      const feeProofInputs = await this.core.createPaymentProofInputs(
        this.userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        this.userId,
        spendingKeyRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      this.feeProofOutputs = [];
      for (const proofInput of feeProofInputs) {
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.feeProofOutputs.push(await this.core.createPaymentProof(proofInput, txRefNo));
      }
    }

    {
      const proofInput = await this.core.createAccountProofInput(
        this.userId,
        spendingPublicKey,
        false,
        undefined,
        this.spendingPublicKey1,
        this.spendingPublicKey2,
        undefined,
      );
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);
    }
  }

  public exportProofTxs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    return [this.proofOutput, ...this.feeProofOutputs].map(proofOutputToProofTx);
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    this.txIds = await this.core.sendProofs([this.proofOutput, ...this.feeProofOutputs]);
    return this.txIds[0];
  }

  public getTxIds() {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

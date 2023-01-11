import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData, validateBridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk/index.js';
import { ProofOutput, proofOutputToProofTx } from '../proofs/index.js';
import { Signer } from '../signer/index.js';
import { createTxRefNo } from './create_tx_ref_no.js';

export class DefiController {
  private readonly requireFeePayingTx: boolean;
  private proofOutput?: ProofOutput;
  private jsProofOutputs: ProofOutput[] = [];
  private feeProofOutputs: ProofOutput[] = [];
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly bridgeCallData: BridgeCallData,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    if (!assetValue.value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    if (
      assetValue.assetId !== bridgeCallData.inputAssetIdA &&
      (bridgeCallData.inputAssetIdB === undefined || assetValue.assetId !== bridgeCallData.inputAssetIdB)
    ) {
      throw new Error(
        `Incorrect deposit asset. Expect ${bridgeCallData.inputAssetIdA}${
          bridgeCallData.inputAssetIdB !== undefined ? ` or ${bridgeCallData.inputAssetIdB}` : ''
        }. Got ${assetValue.assetId}.`,
      );
    }

    validateBridgeCallData(bridgeCallData);

    if (fee.value && fee.assetId === bridgeCallData.inputAssetIdB) {
      throw new Error('Fee paying asset must be the first input asset.');
    }

    this.requireFeePayingTx = !!fee.value && fee.assetId !== bridgeCallData.inputAssetIdA;
  }

  public async createProof() {
    const { value } = this.assetValue;
    const spendingPublicKey = this.userSigner.getPublicKey();
    const spendingKeyRequired = !spendingPublicKey.equals(this.userId);

    const proofInputs = await this.core.createDefiProofInput(
      this.userId,
      this.bridgeCallData,
      value,
      this.requireFeePayingTx ? BigInt(0) : this.fee.value,
      spendingPublicKey,
    );
    for (const proofInput of proofInputs) {
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    }

    const txRefNo = this.requireFeePayingTx || proofInputs.length > 1 ? createTxRefNo() : 0;

    const joinSplitProofInputs = proofInputs.slice(0, -1);
    const defiProofInput = proofInputs[proofInputs.length - 1];
    for (const proofInput of joinSplitProofInputs) {
      this.jsProofOutputs.push(await this.core.createPaymentProof(proofInput, txRefNo));
    }
    this.proofOutput = await this.core.createDefiProof(defiProofInput, txRefNo);

    if (this.requireFeePayingTx) {
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
  }

  public exportProofTxs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    return [...this.jsProofOutputs, this.proofOutput, ...this.feeProofOutputs].map(proofOutputToProofTx);
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    this.txIds = await this.core.sendProofs([...this.jsProofOutputs, this.proofOutput, ...this.feeProofOutputs]);
    return this.getDefiTxId();
  }

  public getTxIds() {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitDefiDepositCompletion(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  public async awaitDefiFinalisation(timeout?: number) {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitSettlement(timeout?: number) {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitDefiSettlement(txId, timeout);
  }

  public getInteractionNonce() {
    const txId = this.getDefiTxId();
    if (!txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    return this.core.getDefiInteractionNonce(txId);
  }

  private getDefiTxId() {
    return this.txIds[this.jsProofOutputs.length];
  }
}

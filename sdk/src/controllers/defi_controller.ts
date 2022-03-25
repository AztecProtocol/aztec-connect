import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class DefiController {
  private proofOutput!: ProofOutput;
  private jsProofOutput?: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds!: TxId[];

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly bridgeId: BridgeId,
    public readonly value: AssetValue,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    if (!value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    if (value.assetId !== bridgeId.inputAssetIdA) {
      throw new Error('Invalid asset.');
    }
  }

  public async createProof() {
    const { assetId, value } = this.value;
    const requireFeePayingTx = this.fee.value && this.fee.assetId !== assetId;
    const privateInput = value + (!requireFeePayingTx ? this.fee.value : BigInt(0));
    const notes = await this.core.pickNotes(this.userId, assetId, privateInput);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const spendingPublicKey = this.userSigner.getPublicKey();

    const totalInputNoteValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const changeValue = totalInputNoteValue - privateInput;

    const txRefNo = requireFeePayingTx || changeValue ? createTxRefNo() : 0;

    // Create a defi deposit tx with 0 change value.
    if (!changeValue) {
      const proofInput = await this.core.createDefiProofInput(
        this.userId,
        this.bridgeId,
        value,
        !requireFeePayingTx ? this.fee.value : BigInt(0),
        undefined,
        spendingPublicKey,
      );
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.proofOutput = await this.core.createDefiProof(proofInput, txRefNo);
    } else {
      // Create a join split tx to generate an output note with the exact value for the defi deposit plus fee.
      {
        const proofInput = await this.core.createPaymentProofInput(
          this.userId,
          assetId,
          BigInt(0),
          BigInt(0),
          privateInput,
          privateInput,
          BigInt(0),
          this.userId,
          undefined,
          spendingPublicKey,
          3, // allowChain
        );
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.jsProofOutput = await this.core.createPaymentProof(proofInput, txRefNo);
      }

      // Use the first output note from the above j/s tx as the input note.
      {
        const inputNotes = [this.jsProofOutput.outputNotes[0]];
        const proofInput = await this.core.createDefiProofInput(
          this.userId,
          this.bridgeId,
          value,
          !requireFeePayingTx ? this.fee.value : BigInt(0),
          inputNotes,
          spendingPublicKey,
        );
        proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
        this.proofOutput = await this.core.createDefiProof(proofInput, txRefNo);
      }
    }

    if (requireFeePayingTx) {
      const proofInput = await this.core.createPaymentProofInput(
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
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(proofInput, txRefNo);
    }
  }

  private getDefiDepositTxId() {
    return this.txIds[this.jsProofOutput ? 1 : 0];
  }

  async send() {
    this.txIds = await this.core.sendProofs(
      filterUndefined([this.jsProofOutput, this.proofOutput, this.feeProofOutput]),
    );
    return this.getDefiDepositTxId();
  }

  async awaitDefiDepositCompletion(timeout?: number) {
    const defiTxId = this.getDefiDepositTxId();
    await this.core.awaitDefiDepositCompletion(defiTxId, timeout);
  }

  async awaitDefiFinalisation(timeout?: number) {
    const defiTxId = this.getDefiDepositTxId();
    await this.core.awaitDefiFinalisation(defiTxId, timeout);
  }

  async awaitSettlement(timeout?: number) {
    const defiTxId = this.getDefiDepositTxId();
    await this.core.awaitDefiSettlement(defiTxId, timeout);
  }

  async getInteractionNonce() {
    return await this.core.getDefiInteractionNonce(this.getDefiDepositTxId());
  }
}

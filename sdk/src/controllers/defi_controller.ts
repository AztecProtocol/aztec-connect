import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdk } from '../core_sdk/core_sdk';
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
    private readonly core: CoreSdk,
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

    const totalInputNoteValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const changeValue = totalInputNoteValue - privateInput;

    const txRefNo = requireFeePayingTx || changeValue ? createTxRefNo() : 0;

    // Create a defi deposit tx with 0 change value.
    if (!changeValue) {
      this.proofOutput = await this.core.createDefiProof(
        this.userId,
        this.userSigner,
        this.bridgeId,
        value,
        !requireFeePayingTx ? this.fee.value : BigInt(0),
        undefined,
        txRefNo,
      );
    } else {
      // Create a join split tx to generate an output note with the exact value for the defi deposit plus fee.
      this.jsProofOutput = await this.core.createPaymentProof(
        this.userId,
        this.userSigner,
        assetId,
        BigInt(0),
        BigInt(0),
        privateInput,
        privateInput,
        BigInt(0),
        this.userId,
        undefined,
        3, // allowChain
        txRefNo,
      );

      // Use the first output note from the above j/s tx as the input note.
      const inputNotes = [this.jsProofOutput.outputNotes[0]];
      this.proofOutput = await this.core.createDefiProof(
        this.userId,
        this.userSigner,
        this.bridgeId,
        value,
        !requireFeePayingTx ? this.fee.value : BigInt(0),
        inputNotes,
        txRefNo,
      );
    }

    if (requireFeePayingTx) {
      this.feeProofOutput = await this.core.createPaymentProof(
        this.userId,
        this.userSigner,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        undefined,
        undefined,
        2,
        txRefNo,
      );
    }
  }

  private getDefiDepositTxId() {
    return this.txIds[this.jsProofOutput ? 1 : 0];
  }

  async send() {
    this.txIds = await this.core.sendProofs(
      filterUndefined([this.jsProofOutput, this.proofOutput, this.feeProofOutput]),
    );
    return this.getDefiDepositTxId();;
  }

  async awaitDefiInteraction(timeout?: number) {
    const defiTxId = this.getDefiDepositTxId()
    await this.core.awaitDefiInteraction(defiTxId, timeout);
  }

  async awaitDefiDepositCompletion(timeout?: number) {
    const defiTxId = this.getDefiDepositTxId();
    await this.core.awaitDefiDepositCompletion(defiTxId, timeout);
  }

  async awaitSettlement(timeout?: number) {
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  async getInteractionNonce() {
    return await this.core.getDefiInteractionNonce(this.getDefiDepositTxId());
  }
}

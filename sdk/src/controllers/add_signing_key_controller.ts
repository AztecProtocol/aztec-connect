import { AccountId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class AddSigningKeyController {
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txId!: TxId;

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly signingPublicKey1: GrumpkinAddress,
    public readonly signingPublicKey2: GrumpkinAddress | undefined,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {}

  public async createProof() {
    const user = await this.core.getUserData(this.userId);
    if (!user.aliasHash) {
      throw new Error('User not registered or not fully synced.');
    }

    const requireFeePayingTx = this.fee.value;
    const txRefNo = requireFeePayingTx ? createTxRefNo() : 0;

    const signingPublicKey = this.userSigner.getPublicKey();

    const proofInput = await this.core.createAccountProofInput(
      this.userId,
      user.aliasHash,
      false,
      signingPublicKey,
      this.signingPublicKey1,
      this.signingPublicKey2,
      undefined,
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);

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
        signingPublicKey,
        2,
      );
      feeProofInput.signature = await this.userSigner.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
    }
  }

  async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    [this.txId] = await this.core.sendProofs(filterUndefined([this.proofOutput, this.feeProofOutput]));
    return this.txId;
  }

  async awaitSettlement(timeout?: number) {
    if (!this.txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitSettlement(this.txId, timeout);
  }
}

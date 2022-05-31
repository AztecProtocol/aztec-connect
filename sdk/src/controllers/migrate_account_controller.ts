import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class MigrateAccountController {
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txId!: TxId;

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    private readonly alias: string,
    public readonly newAccountPrivateKey: Buffer,
    public readonly newSpendingPublicKey: GrumpkinAddress,
    public readonly recoveryPublicKey: GrumpkinAddress | undefined,
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {}

  public async createProof() {
    const requireFeePayingTx = this.fee.value;
    const txRefNo = requireFeePayingTx ? createTxRefNo() : 0;
    const spendingPublicKey = this.userSigner.getPublicKey();
    const proofInput = await this.core.createAccountProofInput(
      this.userId,
      this.alias,
      true,
      spendingPublicKey,
      this.newSpendingPublicKey,
      this.recoveryPublicKey,
      this.newAccountPrivateKey,
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);

    if (requireFeePayingTx) {
      const accountRequired = !spendingPublicKey.equals(this.userId);
      const feeProofInput = await this.core.createPaymentProofInput(
        this.userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        this.userId,
        accountRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await this.userSigner.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
    }
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    [this.txId] = await this.core.sendProofs(filterUndefined([this.proofOutput, this.feeProofOutput]));
    return this.txId;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitSettlement(this.txId, timeout);
  }
}

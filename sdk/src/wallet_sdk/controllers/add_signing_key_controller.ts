import { AccountId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { CoreSdk } from '../../core_sdk/core_sdk';
import { ProofOutput } from '../../proofs';
import { Signer } from '../../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { filterUndefined } from './filter_undefined';

export class AddSigningKeyController {
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly signingPublicKey1: GrumpkinAddress,
    public readonly signingPublicKey2: GrumpkinAddress | undefined,
    public readonly fee: AssetValue,
    private readonly core: CoreSdk,
  ) {}

  public async createProof() {
    const user = this.core.getUserData(this.userId);
    if (!user.aliasHash) {
      throw new Error('User not registered or not fully synced.');
    }

    const requireFeePayingTx = this.fee.value;
    const txRefNo = requireFeePayingTx ? createTxRefNo() : 0;

    this.proofOutput = await this.core.createAccountProof(
      this.userId,
      this.userSigner,
      user.aliasHash,
      false,
      this.signingPublicKey1,
      this.signingPublicKey2,
      undefined,
      txRefNo,
    );

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

  async send() {
    const txHashes = await this.core.sendProofs(filterUndefined([this.proofOutput, this.feeProofOutput]));
    return txHashes[0];
  }
}

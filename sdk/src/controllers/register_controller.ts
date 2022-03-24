import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { DepositController } from './deposit_controller';

export class RegisterController {
  private readonly newUserId: AccountId;
  private depositController?: DepositController;
  private proofOutput!: ProofOutput;
  private txIds!: TxId[];

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly alias: string,
    public readonly signingPublicKey: GrumpkinAddress,
    public readonly recoveryPublicKey: GrumpkinAddress | undefined,
    public readonly deposit: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    private readonly core: CoreSdkInterface,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    if (userId.accountNonce !== 0) {
      throw new Error('Registration proof can only be created by account with nonce 0.');
    }

    if (deposit.value && fee.value && deposit.assetId !== fee.assetId) {
      throw new Error('Inconsistent asset ids.');
    }

    this.newUserId = new AccountId(userId.publicKey, 1);

    if (deposit.value || fee.value) {
      this.depositController = new DepositController(
        userId,
        this.userSigner,
        deposit,
        fee,
        depositor,
        this.newUserId,
        core,
        blockchain,
        provider,
      );
    }
  }

  async getPendingFunds() {
    return this.depositController!.getPendingFunds();
  }

  async getRequiredFunds() {
    return this.depositController!.getRequiredFunds();
  }

  async getPublicAllowance() {
    return this.depositController!.getPublicAllowance();
  }

  async approve() {
    return this.depositController!.approve();
  }

  async depositFundsToContract() {
    return this.depositController!.depositFundsToContract();
  }

  async depositFundsToContractWithPermit(deadline: bigint) {
    return this.depositController!.depositFundsToContractWithPermit(deadline);
  }

  async depositFundsToContractWithProofApproval() {
    return this.depositController!.depositFundsToContractWithProofApproval();
  }

  async depositFundsToContractWithPermitAndProofApproval(deadline: bigint) {
    return this.depositController!.depositFundsToContractWithPermitAndProofApproval(deadline);
  }

  async createProof() {
    const aliasHash = await this.core.computeAliasHash(this.alias);
    const txRefNo = this.depositController ? createTxRefNo() : 0;
    const signingPublicKey = this.userSigner.getPublicKey();

    const proofInput = await this.core.createAccountProofInput(
      this.userId,
      aliasHash,
      true,
      signingPublicKey,
      this.signingPublicKey,
      this.recoveryPublicKey,
      undefined,
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);

    if (this.depositController) {
      await this.depositController.createProof(txRefNo);
    }
  }

  getSigningData() {
    return this.depositController?.getSigningData();
  }

  async isProofApproved() {
    return this.depositController!.isProofApproved();
  }

  async approveProof() {
    return this.depositController!.approveProof();
  }

  async sign() {
    return this.depositController!.sign();
  }

  isSignatureValid() {
    return this.depositController!.isSignatureValid();
  }

  async send() {
    if (!this.depositController) {
      this.txIds = await this.core.sendProofs([this.proofOutput]);
    } else {
      const [{ tx, ...proofOutputData }] = this.depositController.getProofs();
      const recipientTx = createCorePaymentTxForRecipient(tx as CorePaymentTx, this.newUserId);
      const feeProofOutput = { tx: recipientTx, ...proofOutputData };
      this.txIds = await this.core.sendProofs([this.proofOutput, feeProofOutput]);
    }
    return this.txIds[0];
  }

  async awaitSettlement(timeout?: number) {
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

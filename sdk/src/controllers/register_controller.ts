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
  private txId!: TxId;

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

  public async getPendingFunds() {
    return this.depositController!.getPendingFunds();
  }

  public async getRequiredFunds() {
    return this.depositController!.getRequiredFunds();
  }

  public async getPublicAllowance() {
    return this.depositController!.getPublicAllowance();
  }

  public async approve() {
    return this.depositController!.approve();
  }

  public async awaitApprove(timeout?: number, interval?: number) {
    this.depositController!.awaitApprove(timeout, interval);
  }

  public async depositFundsToContract(permitDeadline?: bigint) {
    return this.depositController!.depositFundsToContract(permitDeadline);
  }

  public async depositFundsToContractWithNonStandardPermit(permitDeadline: bigint) {
    return this.depositController!.depositFundsToContractWithNonStandardPermit(permitDeadline);
  }

  public async awaitDepositFundsToContract(timeout?: number, interval?: number) {
    return this.depositController!.awaitDepositFundsToContract(timeout, interval);
  }

  public async createProof() {
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

  public getProofHash() {
    return this.depositController?.getProofHash();
  }

  public getSigningData() {
    return this.depositController?.getSigningData();
  }

  public async isProofApproved() {
    return this.depositController!.isProofApproved();
  }

  public async approveProof() {
    return this.depositController!.approveProof();
  }

  public async awaitApproveProof(timeout?: number, interval?: number) {
    return this.depositController!.awaitApproveProof(timeout, interval);
  }

  public async sign() {
    return this.depositController!.sign();
  }

  public isSignatureValid() {
    return this.depositController!.isSignatureValid();
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    if (!(await this.core.userExists(this.newUserId))) {
      throw new Error('Add the new user to the sdk first.');
    }

    if (!this.depositController) {
      [this.txId] = await this.core.sendProofs([this.proofOutput]);
    } else {
      const [{ tx, ...proofOutputData }] = this.depositController.getProofs();
      const recipientTx = createCorePaymentTxForRecipient(tx as CorePaymentTx, this.newUserId);
      const feeProofOutput = { tx: recipientTx, ...proofOutputData };
      [this.txId] = await this.core.sendProofs([this.proofOutput, feeProofOutput]);
    }
    return this.txId;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txId) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await this.core.awaitSettlement(this.txId, timeout);
  }
}

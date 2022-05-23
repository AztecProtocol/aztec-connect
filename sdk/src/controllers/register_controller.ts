import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx';
import { ProofOutput } from '../proofs';
import { SchnorrSigner } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { DepositController, FeePayer } from './deposit_controller';

export class RegisterController {
  private depositController?: DepositController;
  private proofOutput?: ProofOutput;
  private txId?: TxId;

  constructor(
    public readonly userId: AccountId,
    public readonly alias: string,
    private readonly accountPrivateKey: Buffer,
    public readonly signingPublicKey: GrumpkinAddress,
    public readonly recoveryPublicKey: GrumpkinAddress | undefined,
    public readonly deposit: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    public readonly feePayer: FeePayer | undefined,
    private readonly core: CoreSdkInterface,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    if (userId.accountNonce !== 1) {
      throw new Error(`Expect new user to have account nonce 1. Got ${userId.accountNonce}.`);
    }

    if (deposit.value || fee.value) {
      this.depositController = new DepositController(
        deposit,
        fee,
        depositor,
        this.userId,
        feePayer,
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
    const accountPublicKey = await this.core.derivePublicKey(this.accountPrivateKey);
    if (!accountPublicKey.equals(this.userId.publicKey)) {
      throw new Error('`accountPrivateKey` does not belong to the new user.');
    }

    const signer = new SchnorrSigner(this.core, accountPublicKey, this.accountPrivateKey);
    const spendingPublicKey = signer.getPublicKey();
    const aliasHash = await this.core.computeAliasHash(this.alias);
    const txRefNo = this.depositController ? createTxRefNo() : 0;

    const proofInput = await this.core.createAccountProofInput(
      new AccountId(accountPublicKey, 0),
      aliasHash,
      true,
      spendingPublicKey,
      this.signingPublicKey,
      this.recoveryPublicKey,
      undefined,
    );
    proofInput.signature = await signer.signMessage(proofInput.signingData);
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

    if (!this.depositController) {
      [this.txId] = await this.core.sendProofs([this.proofOutput]);
    } else {
      const [{ tx, ...proofOutputData }] = this.depositController.getProofs();
      const recipientTx = createCorePaymentTxForRecipient(tx as CorePaymentTx, this.userId);
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

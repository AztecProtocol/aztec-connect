import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { RecoveryPayload } from '../user';
import { createTxRefNo } from './create_tx_ref_no';
import { DepositController } from './deposit_controller';
import { FeePayer } from './fee_payer';

export class RecoverAccountController {
  private readonly requireFeePayingTx: boolean;
  private readonly depositController?: DepositController;
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds: TxId[] = [];

  constructor(
    public readonly recoveryPayload: RecoveryPayload,
    public readonly depositValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress | undefined,
    public readonly feePayer: FeePayer | undefined,
    private readonly core: CoreSdkInterface,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    const requireSecondAsset = fee.assetId !== depositValue.assetId && fee.value && depositValue.value;
    if (requireSecondAsset && !feePayer) {
      throw new Error('Cannot deposit two assets. Fee payer required to pay the fee with private funds.');
    }

    this.requireFeePayingTx = !!(fee.value && feePayer);

    // Create a deposit controller if depositing non-zero value or paying fee via deposit.
    if (depositValue.value || (fee.value && !this.requireFeePayingTx)) {
      if (!depositor) {
        throw new Error('Depositor not provided.');
      }

      const {
        recoveryData: { accountPublicKey },
      } = recoveryPayload;
      this.depositController = new DepositController(
        depositValue,
        this.requireFeePayingTx ? { ...fee, value: BigInt(0) } : fee,
        depositor,
        accountPublicKey,
        true, // recipientSpendingKeyRequired
        undefined, // feePayer
        core,
        blockchain,
        provider,
      );
    }
  }

  public async getPendingFunds() {
    return await this.depositController!.getPendingFunds();
  }

  public async getRequiredFunds() {
    return await this.depositController!.getRequiredFunds();
  }

  public async getPublicAllowance() {
    return await this.depositController!.getPublicAllowance();
  }

  public async approve() {
    return await this.depositController!.approve();
  }

  public async awaitApprove(timeout?: number, interval?: number) {
    await this.depositController!.awaitApprove(timeout, interval);
  }

  public async depositFundsToContract(permitDeadline?: bigint) {
    return await this.depositController!.depositFundsToContract(permitDeadline);
  }

  public async depositFundsToContractWithNonStandardPermit(permitDeadline: bigint) {
    return await this.depositController!.depositFundsToContractWithNonStandardPermit(permitDeadline);
  }

  public async awaitDepositFundsToContract(timeout?: number, interval?: number) {
    return await this.depositController!.awaitDepositFundsToContract(timeout, interval);
  }

  public async createProof() {
    const {
      trustedThirdPartyPublicKey,
      recoveryPublicKey,
      recoveryData: { accountPublicKey, signature },
    } = this.recoveryPayload;
    const txRefNo = this.depositController || this.requireFeePayingTx ? createTxRefNo() : 0;

    const proofInput = await this.core.createAccountProofInput(
      accountPublicKey,
      recoveryPublicKey,
      false,
      undefined,
      trustedThirdPartyPublicKey,
      undefined,
      undefined,
    );
    proofInput.signature = signature;
    this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);

    if (this.depositController) {
      await this.depositController.createProof(txRefNo);
    }

    if (this.requireFeePayingTx) {
      const { userId, signer } = this.feePayer!;
      const spendingPublicKey = signer.getPublicKey();
      const spendingKeyRequired = !spendingPublicKey.equals(userId);
      const feeProofInput = await this.core.createPaymentProofInput(
        userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        userId,
        spendingKeyRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await signer.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
    }
  }

  public getProofHash() {
    return this.depositController?.getProofHash();
  }

  public getSigningData() {
    return this.depositController?.getSigningData();
  }

  public async isProofApproved() {
    return await this.depositController!.isProofApproved();
  }

  public async approveProof() {
    return await this.depositController!.approveProof();
  }

  public async awaitApproveProof(timeout?: number, interval?: number) {
    return await this.depositController!.awaitApproveProof(timeout, interval);
  }

  public async sign() {
    return await this.depositController!.sign();
  }

  public isSignatureValid() {
    return this.depositController!.isSignatureValid();
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    const proofs = [this.proofOutput];
    if (this.depositController) {
      proofs.push(...this.depositController.getProofs());
    }
    if (this.feeProofOutput) {
      proofs.push(this.feeProofOutput);
    }
    this.txIds = await this.core.sendProofs(proofs);

    return this.txIds[0];
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

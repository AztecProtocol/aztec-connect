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

export class RecoverAccountController {
  private depositController?: DepositController;
  private proofOutput!: ProofOutput;
  private txIds: TxId[] = [];

  constructor(
    public readonly alias: string,
    public readonly recoveryPayload: RecoveryPayload,
    public readonly depositValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    private readonly core: CoreSdkInterface,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    const {
      recoveryData: { accountPublicKey },
    } = recoveryPayload;

    if (depositValue.value || fee.value) {
      if (depositValue.assetId !== fee.assetId) {
        throw new Error('Inconsistent asset ids.');
      }

      this.depositController = new DepositController(
        depositValue,
        fee,
        depositor,
        accountPublicKey,
        true, // recipientSpendingKeyRequired
        undefined,
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
    const txRefNo = this.depositController ? createTxRefNo() : 0;

    const proofInput = await this.core.createAccountProofInput(
      accountPublicKey,
      this.alias,
      false,
      recoveryPublicKey,
      trustedThirdPartyPublicKey,
      undefined,
      undefined,
    );
    proofInput.signature = signature;
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
    if (!this.depositController) {
      this.txIds = await this.core.sendProofs([this.proofOutput]);
    } else {
      const [feeProofOutput] = this.depositController.getProofs();
      this.txIds = await this.core.sendProofs([this.proofOutput, feeProofOutput]);
    }
    return this.txIds[0];
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}

import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSigner, TxHash } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain, createPermitData, validateSignature, Web3Signer } from '@aztec/blockchain';
import { CoreSdk } from '../core_sdk/core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';

const signDepositProof = async (signingData: Buffer, depositor: EthAddress, ethSigner: EthereumSigner) =>
  ethSigner.signMessage(signingData, depositor);

export class DepositController {
  private readonly publicInput: AssetValue;
  private readonly requireFeePayingTx: boolean;
  private proofOutput?: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txIds?: TxId[];
  private txHash?: TxHash;

  constructor(
    public readonly userId: AccountId,
    private readonly userSigner: Signer,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly from: EthAddress,
    public readonly to: AccountId,
    private readonly core: CoreSdk,
    private readonly blockchain: ClientEthereumBlockchain,
    private readonly provider: EthereumProvider,
  ) {
    const { assetId, value } = assetValue;
    this.publicInput = { assetId, value: value + (fee.assetId === assetId ? fee.value : BigInt(0)) };
    this.requireFeePayingTx = !!fee.value && fee.assetId !== assetId;
  }

  async getPendingFunds() {
    const { assetId } = this.publicInput;
    const deposited = await this.blockchain.getUserPendingDeposit(assetId, this.from);
    const txs = await this.core.getRemoteUnsettledPaymentTxs();
    const unsettledDeposit = txs
      .filter(
        tx =>
          tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
          tx.proofData.publicAssetId === assetId &&
          tx.proofData.publicOwner.equals(this.from),
      )
      .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), BigInt(0));
    return deposited - unsettledDeposit;
  }

  async getRequiredFunds() {
    const { value } = this.publicInput;
    const pendingFunds = await this.getPendingFunds();
    return pendingFunds < value ? value - pendingFunds : BigInt(0);
  }

  async getPublicAllowance() {
    const { assetId } = this.publicInput;
    const { rollupContractAddress } = this.core.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(this.from, rollupContractAddress);
  }

  async approve() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const { rollupContractAddress } = this.core.getLocalStatus();
    return this.blockchain
      .getAsset(assetId)
      .approve(value, this.from, rollupContractAddress, { provider: this.provider });
  }

  async depositFundsToContract() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    this.txHash = await this.blockchain.depositPendingFunds(
      assetId,
      value,
      this.from,
      undefined,
      undefined,
      this.provider,
    );
    return this.txHash;
  }

  async depositFundsToContractWithPermit(deadline: bigint) {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const permitArgs = await this.createPermitArgs(value, deadline);
    this.txHash = await this.blockchain.depositPendingFunds(
      assetId,
      value,
      this.from,
      undefined,
      permitArgs,
      this.provider,
    );
    return this.txHash;
  }

  async depositFundsToContractWithProofApproval() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const proofHash = this.getTxId().toBuffer();
    this.txHash = await this.blockchain.depositPendingFunds(
      assetId,
      value,
      this.from,
      proofHash,
      undefined,
      this.provider,
    );
    return this.txHash;
  }

  async depositFundsToContractWithPermitAndProofApproval(deadline: bigint) {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const permitArgs = await this.createPermitArgs(value, deadline);
    const proofHash = this.getTxId().toBuffer();
    this.txHash = await this.blockchain.depositPendingFunds(
      assetId,
      value,
      this.from,
      proofHash,
      permitArgs,
      this.provider,
    );
    return this.txHash;
  }

  async awaitDepositFundsToContract() {
    if (!this.txHash) {
      throw new Error('Call depositFundsToContract() first.');
    }
    await this.blockchain.getTransactionReceipt(this.txHash);
  }

  async createProof(txRefNo = 0) {
    const { assetId, value } = this.publicInput;
    const privateOutput = this.requireFeePayingTx ? value : value - this.fee.value;
    const [recipientPrivateOutput, senderPrivateOutput] = this.to.equals(this.userId)
      ? [BigInt(0), privateOutput]
      : [privateOutput, BigInt(0)];
    if (this.requireFeePayingTx && !txRefNo) {
      txRefNo = createTxRefNo();
    }

    this.proofOutput = await this.core.createPaymentProof(
      this.userId,
      this.userSigner,
      assetId,
      value, // publicInput,
      BigInt(0), // publicOutput
      BigInt(0), // privateInput
      recipientPrivateOutput,
      senderPrivateOutput,
      this.to, // noteRecipient
      this.from, // publicOwner
      0, // allowChain
      txRefNo,
    );

    if (this.requireFeePayingTx) {
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

  getSigningData() {
    return this.getTxId().toDepositSigningData();
  }

  getTxId() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    return this.proofOutput.tx.txId;
  }

  async isProofApproved() {
    return !!(await this.blockchain.getUserProofApprovalStatus(this.from, this.getTxId().toBuffer()));
  }

  async approveProof() {
    return this.blockchain.approveProof(this.from, this.getTxId().toBuffer(), this.provider);
  }

  async sign() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    const ethSigner = new Web3Signer(this.provider);
    const signingData = this.getSigningData();
    this.proofOutput.signature = await signDepositProof(signingData, this.from, ethSigner);
  }

  isSignatureValid() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() and sign() first.');
    }
    const signingData = this.getSigningData();
    return validateSignature(this.from, this.proofOutput.signature!, signingData);
  }

  getProofs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    return this.requireFeePayingTx ? [this.proofOutput, this.feeProofOutput!] : [this.proofOutput];
  }

  async send() {
    this.txIds = await this.core.sendProofs(this.getProofs());
    return this.txIds[0];
  }

  async awaitSettlement(timeout?: number) {
    if (!this.txIds) {
      throw new Error('Call send() first.');
    }
    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  private async createPermitArgs(value: bigint, deadline: bigint) {
    const { assetId } = this.publicInput;
    const nonce = await this.blockchain.getAsset(assetId).getUserNonce(this.from);
    const { rollupContractAddress, chainId, assets } = this.core.getLocalStatus();
    const asset = assets[assetId];
    const permitData = createPermitData(
      asset.name,
      this.from,
      rollupContractAddress,
      value,
      nonce,
      deadline,
      chainId,
      asset.address,
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.from);
    return { approvalAmount: value, deadline, signature };
  }
}

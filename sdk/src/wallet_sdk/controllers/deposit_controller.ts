import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSigner } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { ClientEthereumBlockchain, createPermitData, validateSignature, Web3Signer } from '@aztec/blockchain';
import { CoreSdk } from '../../core_sdk/core_sdk';
import { ProofOutput } from '../../proofs';
import { Signer } from '../../signer';
import { createTxRefNo } from './create_tx_ref_no';

const signDepositProof = async (signingData: Buffer, depositor: EthAddress, ethSigner: EthereumSigner) =>
  ethSigner.signMessage(
    Buffer.concat([
      Buffer.from('Signing this message will allow your pending funds to be spent in Aztec transaction:\n'),
      signingData,
      Buffer.from('\nIMPORTANT: Only sign the message if you trust the client'),
    ]),
    depositor,
  );

export class DepositController {
  private readonly publicInput: AssetValue;
  private readonly requireFeePayingTx: boolean;
  private proofOutput!: ProofOutput;
  private feeProofOutput?: ProofOutput;

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
    return this.blockchain.depositPendingFunds(assetId, value, this.from, undefined, undefined, this.provider);
  }

  async depositFundsToContractWithPermit(deadline: bigint) {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const permitArgs = await this.createPermitArgs(value, deadline);
    return this.blockchain.depositPendingFunds(assetId, value, this.from, undefined, permitArgs, this.provider);
  }

  async depositFundsToContractWithProofApproval() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const proofHash = this.getSigningData();
    return this.blockchain.depositPendingFunds(assetId, value, this.from, proofHash, undefined, this.provider);
  }

  async depositFundsToContractWithPermitAndProofApproval(deadline: bigint) {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const permitArgs = await this.createPermitArgs(value, deadline);
    const proofHash = this.getSigningData();
    return this.blockchain.depositPendingFunds(assetId, value, this.from, proofHash, permitArgs, this.provider);
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
      3,
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
    return this.proofOutput.tx.txHash.toBuffer();
  }

  async isProofApproved() {
    return !!(await this.blockchain.getUserProofApprovalStatus(this.from, this.getSigningData()));
  }

  async approveProof() {
    return this.blockchain.approveProof(this.from, this.getSigningData(), this.provider);
  }

  async sign() {
    const ethSigner = new Web3Signer(this.provider);
    const signingData = this.getSigningData();
    this.proofOutput.signature = await signDepositProof(signingData, this.from, ethSigner);
  }

  isSignatureValid() {
    const signingData = this.getSigningData();
    return validateSignature(this.from, this.proofOutput.signature!, signingData);
  }

  getProofs() {
    return this.requireFeePayingTx ? [this.proofOutput, this.feeProofOutput!] : [this.proofOutput];
  }

  async send() {
    const txHashes = await this.core.sendProofs(this.getProofs());
    return txHashes[0];
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

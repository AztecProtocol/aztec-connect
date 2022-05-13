import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSigner, TxHash } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import {
  ClientEthereumBlockchain,
  createPermitData,
  createPermitDataNonStandard,
  validateSignature,
  Web3Signer,
} from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
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
    private readonly core: CoreSdkInterface,
    private readonly blockchain: ClientEthereumBlockchain,
    private readonly provider: EthereumProvider,
  ) {
    const { assetId, value } = assetValue;
    if (!blockchain.getAsset(assetId)) {
      throw new Error('Unsupported asset');
    }
    if (!value) {
      throw new Error('Deposit value must be greater than 0.');
    }

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
    const { rollupContractAddress } = await this.core.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(this.from, rollupContractAddress);
  }

  async approve() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const { rollupContractAddress } = await this.core.getLocalStatus();
    return this.blockchain
      .getAsset(assetId)
      .approve(value, this.from, rollupContractAddress, { provider: this.provider });
  }

  async depositFundsToContract() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    this.txHash = await this.blockchain.depositPendingFunds(assetId, value, undefined, {
      signingAddress: this.from,
      provider: this.provider,
    });

    return this.txHash;
  }

  async depositFundsToContractWithPermit(deadline: bigint) {
    const { assetId } = this.publicInput;
    if (assetId === 0) {
      throw new Error('Permit flow unsupported for ETH.');
    }
    const value = await this.getRequiredFunds();
    const { signature } = await this.createPermitArgs(value, deadline);
    this.txHash = await this.blockchain.depositPendingFundsPermit(assetId, value, deadline, signature, undefined, {
      signingAddress: this.from,
      provider: this.provider,
    });
    return this.txHash;
  }

  async depositFundsToContractWithNonStandardPermit(deadline: bigint) {
    const { assetId } = this.publicInput;
    if (assetId === 0) {
      throw new Error('Permit flow unsupported for ETH.');
    }
    const { signature, nonce } = await this.createPermitArgsNonStandard(deadline);
    const value = await this.getRequiredFunds();
    this.txHash = await this.blockchain.depositPendingFundsPermitNonStandard(
      assetId,
      value,
      nonce,
      deadline,
      signature,
      undefined,
      {
        signingAddress: this.from,
        provider: this.provider,
      },
    );
    return this.txHash;
  }

  async depositFundsToContractWithProofApproval() {
    const { assetId } = this.publicInput;
    const value = await this.getRequiredFunds();
    const proofHash = this.getTxId().toBuffer();
    this.txHash = await this.blockchain.depositPendingFunds(assetId, value, proofHash, {
      signingAddress: this.from,
      provider: this.provider,
    });
    return this.txHash;
  }

  async depositFundsToContractWithPermitAndProofApproval(deadline: bigint) {
    const { assetId } = this.publicInput;
    if (assetId === 0) {
      throw new Error('Permit flow unsupported for ETH.');
    }
    const value = await this.getRequiredFunds();
    const { signature } = await this.createPermitArgs(value, deadline);
    const proofHash = this.getTxId().toBuffer();
    this.txHash = await this.blockchain.depositPendingFundsPermit(assetId, value, deadline, signature, proofHash, {
      signingAddress: this.from,
      provider: this.provider,
    });
    return this.txHash;
  }

  async depositFundsToContractWithNonStandardPermitAndProofApproval(deadline: bigint) {
    const { assetId } = this.publicInput;
    if (assetId === 0) {
      throw new Error('Permit flow unsupported for ETH.');
    }
    const value = await this.getRequiredFunds();
    const { signature, nonce } = await this.createPermitArgsNonStandard(deadline);
    const proofHash = this.getTxId().toBuffer();
    this.txHash = await this.blockchain.depositPendingFundsPermitNonStandard(
      assetId,
      value,
      nonce,
      deadline,
      signature,
      proofHash,
      {
        signingAddress: this.from,
        provider: this.provider,
      },
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
    const spendingPublicKey = this.userSigner.getPublicKey();

    const proofInput = await this.core.createPaymentProofInput(
      this.userId,
      assetId,
      value, // publicInput,
      BigInt(0), // publicOutput
      BigInt(0), // privateInput
      recipientPrivateOutput,
      senderPrivateOutput,
      this.to, // noteRecipient
      this.from, // publicOwner
      spendingPublicKey,
      0, // allowChain
    );
    proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createPaymentProof(proofInput, txRefNo);

    if (this.requireFeePayingTx) {
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
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await this.userSigner.signMessage(feeProofInput.signingData);
      this.feeProofOutput = await this.core.createPaymentProof(feeProofInput, txRefNo);
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
    return this.blockchain.approveProof(this.getTxId().toBuffer(), {
      signingAddress: this.from,
      provider: this.provider,
    });
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
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.from);
    const { rollupContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitData(
      asset.getStaticInfo().name,
      this.from,
      rollupContractAddress,
      value,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.from);
    return { signature };
  }

  private async createPermitArgsNonStandard(deadline: bigint) {
    const { assetId } = this.publicInput;
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.from);
    const { rollupContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitDataNonStandard(
      asset.getStaticInfo().name,
      this.from,
      rollupContractAddress,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.from);
    return { signature, nonce };
  }
}

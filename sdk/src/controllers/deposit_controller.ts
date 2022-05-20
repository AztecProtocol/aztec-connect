import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, TxHash } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { sleep } from '@aztec/barretenberg/sleep';
import { Timer } from '@aztec/barretenberg/timer';
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

export class DepositController {
  private readonly publicInput: AssetValue;
  private proofOutput?: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txId?: TxId;
  private pendingFundsStatus: {
    pendingDeposit: bigint;
    pendingFunds: bigint;
    requiredFunds: bigint;
    approveTxHash?: TxHash;
    txHash?: TxHash;
    approveProofTxHash?: TxHash;
  } = { pendingDeposit: BigInt(0), pendingFunds: BigInt(0), requiredFunds: BigInt(0) };

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
    if (!value && !fee.value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    this.publicInput = { assetId, value: value + (fee.assetId === assetId ? fee.value : BigInt(0)) };
  }

  public async getPendingFunds() {
    const { pendingFunds } = await this.getPendingFundsStatus();
    return pendingFunds;
  }

  public async getRequiredFunds() {
    const { requiredFunds } = await this.getPendingFundsStatus();
    return requiredFunds;
  }

  public async getPublicAllowance() {
    const { assetId } = this.publicInput;
    const { rollupContractAddress } = await this.core.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(this.from, rollupContractAddress);
  }

  public async hasPermitSupport() {
    const { assetId } = this.publicInput;
    return this.blockchain.hasPermitSupport(assetId);
  }

  public async approve() {
    const permitSupport = await this.hasPermitSupport();
    if (permitSupport) {
      throw new Error('Asset supports permit. No need to call approve().');
    }

    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const { assetId } = this.publicInput;
    const { rollupContractAddress } = await this.core.getLocalStatus();
    const approveTxHash = await this.blockchain
      .getAsset(assetId)
      .approve(value, this.from, rollupContractAddress, { provider: this.provider });

    this.pendingFundsStatus = { ...pendingFundsStatus, approveTxHash };
    return approveTxHash;
  }

  public async awaitApprove(timeout?: number, interval?: number) {
    const { approveTxHash, requiredFunds } = this.pendingFundsStatus;
    if (!approveTxHash) {
      throw new Error('Call approve() first.');
    }

    const checkOnchainData = async () => {
      const allowance = await this.getPublicAllowance();
      return allowance === requiredFunds;
    };
    await this.awaitTransactionReceipt(approveTxHash, checkOnchainData, timeout, interval);
  }

  public async depositFundsToContract(permitDeadline?: bigint) {
    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }
    if (this.pendingFundsStatus.approveTxHash && value < this.pendingFundsStatus.requiredFunds) {
      throw new Error(`Required allowance has increased since approve() was called.`);
    }

    const isContract = await this.blockchain.isContract(this.from);
    const proofHash = isContract ? this.getProofHash() : undefined;
    const permitSupport = await this.hasPermitSupport();
    const { assetId } = this.publicInput;
    let txHash: TxHash;
    if (!permitSupport) {
      txHash = await this.blockchain.depositPendingFunds(assetId, value, proofHash, {
        signingAddress: this.from,
        provider: this.provider,
      });
    } else {
      const deadline = permitDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 5 * 60); // Default deadline is 5 mins from now.
      const { signature } = await this.createPermitArgs(value, deadline);
      txHash = await this.blockchain.depositPendingFundsPermit(assetId, value, deadline, signature, proofHash, {
        signingAddress: this.from,
        provider: this.provider,
      });
    }

    this.pendingFundsStatus = { ...this.pendingFundsStatus, ...pendingFundsStatus, txHash };
    return txHash;
  }

  public async depositFundsToContractWithPermit(deadline: bigint) {
    throw new Error(
      '`DepositController.depositFundsToContractWithPermit()` has been deprecated. Call `depositFundsToContract()` instead.',
    );
  }

  public async depositFundsToContractWithNonStandardPermit(permitDeadline: bigint) {
    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const isContract = await this.blockchain.isContract(this.from);
    const proofHash = isContract ? this.getProofHash() : undefined;
    const { signature, nonce } = await this.createPermitArgsNonStandard(permitDeadline);
    const { assetId } = this.publicInput;
    const txHash = await this.blockchain.depositPendingFundsPermitNonStandard(
      assetId,
      value,
      nonce,
      permitDeadline,
      signature,
      proofHash,
      {
        signingAddress: this.from,
        provider: this.provider,
      },
    );

    this.pendingFundsStatus = { ...pendingFundsStatus, txHash };
    return txHash;
  }

  public async awaitDepositFundsToContract(timeout?: number, interval?: number) {
    const { txHash, pendingDeposit, requiredFunds } = this.pendingFundsStatus;
    if (!txHash) {
      throw new Error('Call depositFundsToContract() first.');
    }

    const { assetId } = this.publicInput;
    const expectedPendingDeposit = pendingDeposit + requiredFunds;
    const checkOnchainData = async () => {
      const value = await this.blockchain.getUserPendingDeposit(assetId, this.from);
      return value === expectedPendingDeposit;
    };
    await this.awaitTransactionReceipt(txHash, checkOnchainData, timeout, interval);
  }

  public async createProof(txRefNo = 0) {
    const { assetId, value } = this.publicInput;
    const requireFeePayingTx = !!this.fee.value && this.fee.assetId !== assetId;
    const privateOutput = requireFeePayingTx ? value : value - this.fee.value;
    const [recipientPrivateOutput, senderPrivateOutput] = this.to.equals(this.userId)
      ? [BigInt(0), privateOutput]
      : [privateOutput, BigInt(0)];
    if (requireFeePayingTx && !txRefNo) {
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

    if (requireFeePayingTx) {
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

  public getProofHash() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    return this.proofOutput.tx.txId.toBuffer();
  }

  public async isProofApproved() {
    const proofHash = this.getProofHash();
    return !!(await this.blockchain.getUserProofApprovalStatus(this.from, proofHash));
  }

  public async approveProof() {
    const proofHash = this.getProofHash();
    const approveProofTxHash = await this.blockchain.approveProof(proofHash, {
      signingAddress: this.from,
      provider: this.provider,
    });
    this.pendingFundsStatus = { ...this.pendingFundsStatus, approveProofTxHash };
    return approveProofTxHash;
  }

  public async awaitApproveProof(timeout?: number, interval?: number) {
    const { approveProofTxHash } = this.pendingFundsStatus;
    if (!approveProofTxHash) {
      throw new Error('Call approveProof() first.');
    }

    const checkOnchainData = async () => this.isProofApproved();
    await this.awaitTransactionReceipt(approveProofTxHash, checkOnchainData, timeout, interval);
  }

  public getSigningData() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    return this.proofOutput.tx.txId.toDepositSigningData();
  }

  public async sign() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    const ethSigner = new Web3Signer(this.provider);
    const signingData = this.getSigningData();
    this.proofOutput.signature = await ethSigner.signMessage(signingData, this.from);
  }

  public isSignatureValid() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() and sign() first.');
    }
    if (!this.proofOutput.signature) {
      throw new Error('Call sign() first.');
    }

    const signingData = this.getSigningData();
    return validateSignature(this.from, this.proofOutput.signature, signingData);
  }

  public getProofs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    return this.feeProofOutput ? [this.proofOutput, this.feeProofOutput] : [this.proofOutput];
  }

  public async send() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }
    if (!this.proofOutput.signature && !(await this.isProofApproved())) {
      throw new Error('Call sign() or approveProof() first.');
    }

    [this.txId] = await this.core.sendProofs(this.getProofs());
    return this.txId;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txId) {
      throw new Error('Call send() first.');
    }

    await this.core.awaitSettlement(this.txId, timeout);
  }

  private async getPendingFundsStatus() {
    const { assetId } = this.publicInput;
    const pendingDeposit = await this.blockchain.getUserPendingDeposit(assetId, this.from);
    const txs = await this.core.getRemoteUnsettledPaymentTxs();
    const unsettledDeposit = txs
      .filter(
        tx =>
          tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
          tx.proofData.publicAssetId === assetId &&
          tx.proofData.publicOwner.equals(this.from),
      )
      .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), BigInt(0));
    const pendingFunds = pendingDeposit - unsettledDeposit;
    const { value } = this.publicInput;
    const requiredFunds = pendingFunds < value ? value - pendingFunds : BigInt(0);
    return { pendingDeposit, pendingFunds, requiredFunds };
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

  private async awaitTransactionReceipt(
    txHash: TxHash,
    checkOnchainData: () => Promise<boolean>,
    timeout?: number,
    interval = 1,
  ) {
    const timer = new Timer();
    const minConfirmation = 0;
    while (true) {
      const txReceipt = await this.blockchain.getTransactionReceipt(txHash, timeout, interval, minConfirmation);
      if (txReceipt.status) {
        return true;
      }

      if (await checkOnchainData()) {
        return true;
      }

      await sleep(interval * 1000);

      if (timeout && timer.s() > timeout) {
        throw new Error(`Timeout awaiting tx confirmation: ${txHash}`);
      }
    }
  }
}

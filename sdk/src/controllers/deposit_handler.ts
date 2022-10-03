import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSignature, TxHash } from '@aztec/barretenberg/blockchain';
import { retryUntil } from '@aztec/barretenberg/retry';
import { InterruptableSleep, sleep } from '@aztec/barretenberg/sleep';
import { Timer } from '@aztec/barretenberg/timer';
import {
  ClientEthereumBlockchain,
  createPermitData,
  createPermitDataNonStandard,
  validateSignature,
  Web3Signer,
} from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';

export class DepositHandler {
  protected readonly publicInput: AssetValue;
  private depositProofOutput?: ProofOutput;
  private pendingFundsStatus: {
    pendingDeposit: bigint;
    pendingFunds: bigint;
    requiredFunds: bigint;
    permitArgs?: { signature: EthereumSignature; deadline: bigint };
    approveTxHash?: TxHash;
    approvedFromContractWallet?: boolean;
    txHash?: TxHash;
    depositedFromContractWallet?: boolean;
    approveProofTxHash?: TxHash;
    proofApprovedFromContractWallet?: boolean;
  } = { pendingDeposit: BigInt(0), pendingFunds: BigInt(0), requiredFunds: BigInt(0) };

  constructor(
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientSpendingKeyRequired: boolean,
    protected readonly core: CoreSdkInterface,
    private readonly blockchain: ClientEthereumBlockchain,
    private readonly provider: EthereumProvider,
  ) {
    const { assetId, value } = assetValue;
    if (!blockchain.getAsset(assetId)) {
      throw new Error('Unsupported asset.');
    }
    if (fee.assetId !== assetId && fee.value && value) {
      throw new Error('Inconsistent asset id.');
    }

    this.publicInput = { assetId, value: value + fee.value };
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
    return this.blockchain.getAsset(assetId).allowance(this.depositor, rollupContractAddress);
  }

  public hasPermitSupport() {
    const { assetId } = this.publicInput;
    return this.blockchain.hasPermitSupport(assetId);
  }

  public async approve(permitDeadline?: bigint) {
    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const allowance = await this.getPublicAllowance();
    if (allowance >= value) {
      throw new Error('User has approved enough amount.');
    }

    const isContract = await this.blockchain.isContract(this.depositor);
    const permitSupport = this.hasPermitSupport() && !isContract;
    if (permitSupport) {
      const permitArgs = await this.createPermitArgs(value, permitDeadline);
      this.pendingFundsStatus = {
        ...pendingFundsStatus,
        permitArgs,
      };
    } else {
      const { assetId } = this.publicInput;
      const { rollupContractAddress } = await this.core.getLocalStatus();
      const approve = () =>
        this.blockchain.getAsset(assetId).approve(value, this.depositor, rollupContractAddress, {
          signingAddress: this.depositor,
          provider: this.provider,
        });
      let approveTxHash: TxHash | undefined;
      if (!isContract) {
        approveTxHash = await approve();
      } else {
        const checkOnchainData = async () => {
          const allowance = await this.getPublicAllowance();
          return allowance >= value;
        };
        approveTxHash = await this.sendTransactionAndCheckOnchainData(
          'approve allowance from contract wallet',
          approve,
          checkOnchainData,
        );
      }

      this.pendingFundsStatus = {
        ...pendingFundsStatus,
        approvedFromContractWallet: isContract && !approveTxHash,
        approveTxHash,
      };
      return approveTxHash;
    }
  }

  public async awaitApprove(timeout?: number, interval?: number) {
    const { approvedFromContractWallet, approveTxHash, requiredFunds } = this.pendingFundsStatus;
    if (approvedFromContractWallet) {
      return;
    }

    if (!approveTxHash) {
      throw new Error('Call approve() first.');
    }

    const checkOnchainData = async () => {
      const allowance = await this.getPublicAllowance();
      return allowance >= requiredFunds;
    };
    await this.awaitTransaction('approve allowance', checkOnchainData, timeout, interval);
  }

  public async depositFundsToContract(permitDeadline?: bigint) {
    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const { assetId } = this.publicInput;
    const isContract = await this.blockchain.isContract(this.depositor);
    const permitSupport = this.hasPermitSupport() && !isContract;
    const allowance = assetId === 0 ? value : await this.getPublicAllowance();
    if (!permitSupport && allowance < value) {
      throw new Error('Insufficient allowance. Call approve() first.');
    }

    const depositFunds = async () => {
      if (permitSupport && allowance < value) {
        const { signature, deadline } =
          pendingFundsStatus.permitArgs || (await this.createPermitArgs(value, permitDeadline));
        return this.blockchain.depositPendingFundsPermit(assetId, value, deadline, signature, {
          signingAddress: this.depositor,
          provider: this.provider,
        });
      } else {
        const proofHash = isContract ? this.getProofHash() : undefined;
        return this.blockchain.depositPendingFunds(assetId, value, proofHash, {
          signingAddress: this.depositor,
          provider: this.provider,
        });
      }
    };

    let txHash: TxHash | undefined;
    if (!isContract) {
      txHash = await depositFunds();
    } else {
      const { pendingDeposit, requiredFunds } = pendingFundsStatus;
      const expectedPendingDeposit = pendingDeposit + requiredFunds;
      const checkOnchainData = async () => {
        const value = await this.blockchain.getUserPendingDeposit(assetId, this.depositor);
        return value === expectedPendingDeposit;
      };
      txHash = await this.sendTransactionAndCheckOnchainData(
        'deposit funds from contract wallet',
        depositFunds,
        checkOnchainData,
      );
    }

    this.pendingFundsStatus = {
      ...pendingFundsStatus,
      depositedFromContractWallet: isContract && !txHash,
      txHash,
    };
    return txHash;
  }

  public async depositFundsToContractWithNonStandardPermit(permitDeadline?: bigint) {
    const pendingFundsStatus = await this.getPendingFundsStatus();
    const value = pendingFundsStatus.requiredFunds;
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const isContract = await this.blockchain.isContract(this.depositor);
    if (isContract) {
      throw new Error('Permit flow not available for contract wallets.');
    }

    let txHash: TxHash;
    const { assetId } = this.publicInput;
    const allowance = await this.getPublicAllowance();
    if (allowance >= value) {
      txHash = await this.blockchain.depositPendingFunds(assetId, value, undefined, {
        signingAddress: this.depositor,
        provider: this.provider,
      });
    } else {
      const { signature, deadline, nonce } = await this.createPermitArgsNonStandard(permitDeadline);
      txHash = await this.blockchain.depositPendingFundsPermitNonStandard(assetId, value, nonce, deadline, signature, {
        signingAddress: this.depositor,
        provider: this.provider,
      });
    }

    this.pendingFundsStatus = {
      ...pendingFundsStatus,
      txHash,
    };
    return txHash;
  }

  public async awaitDepositFundsToContract(timeout?: number, interval?: number) {
    const { depositedFromContractWallet, txHash, pendingDeposit, requiredFunds } = this.pendingFundsStatus;
    if (depositedFromContractWallet) {
      return true;
    }

    if (!txHash) {
      throw new Error('Call depositFundsToContract() first.');
    }

    const { assetId } = this.publicInput;
    const expectedPendingDeposit = pendingDeposit + requiredFunds;
    const checkOnchainData = async () => {
      const value = await this.blockchain.getUserPendingDeposit(assetId, this.depositor);
      return value === expectedPendingDeposit;
    };
    await this.awaitTransaction('deposit pending funds', checkOnchainData, timeout, interval);
  }

  public async createProof(txRefNo = 0) {
    const { assetId, value } = this.publicInput;
    const privateOutput = value - this.fee.value;
    this.depositProofOutput = await this.core.createDepositProof(
      assetId,
      value, // publicInput,
      privateOutput,
      this.depositor,
      this.recipient,
      this.recipientSpendingKeyRequired,
      txRefNo,
    );
  }

  public getProofOutput() {
    if (!this.depositProofOutput) {
      throw new Error('Call createProof() first.');
    }

    return this.depositProofOutput;
  }

  public getProofHash() {
    if (!this.depositProofOutput) {
      throw new Error('Call createProof() first.');
    }

    return this.depositProofOutput.tx.txId.toBuffer();
  }

  public async isProofApproved() {
    const proofHash = this.getProofHash();
    return !!(await this.blockchain.getUserProofApprovalStatus(this.depositor, proofHash));
  }

  public async approveProof() {
    const proofHash = this.getProofHash();
    const isContract = await this.blockchain.isContract(this.depositor);
    const approveProof = () =>
      this.blockchain.approveProof(proofHash, {
        signingAddress: this.depositor,
        provider: this.provider,
      });
    let approveProofTxHash: TxHash | undefined;
    if (!isContract) {
      approveProofTxHash = await approveProof();
    } else {
      const checkOnchainData = () => this.isProofApproved();
      approveProofTxHash = await this.sendTransactionAndCheckOnchainData(
        'approve proof from contract wallet',
        approveProof,
        checkOnchainData,
      );
    }

    this.pendingFundsStatus = {
      ...this.pendingFundsStatus,
      proofApprovedFromContractWallet: isContract && !approveProofTxHash,
      approveProofTxHash,
    };
    return approveProofTxHash;
  }

  public async awaitApproveProof(timeout?: number, interval?: number) {
    const { proofApprovedFromContractWallet, approveProofTxHash } = this.pendingFundsStatus;
    if (proofApprovedFromContractWallet) {
      return true;
    }

    if (!approveProofTxHash) {
      throw new Error('Call approveProof() first.');
    }

    const checkOnchainData = () => this.isProofApproved();
    await this.awaitTransaction('approve proof', checkOnchainData, timeout, interval);
  }

  public getSigningData() {
    if (!this.depositProofOutput) {
      throw new Error('Call createProof() first.');
    }

    return this.depositProofOutput.tx.txId.toDepositSigningData();
  }

  public async sign() {
    if (!this.depositProofOutput) {
      throw new Error('Call createProof() first.');
    }

    const ethSigner = new Web3Signer(this.provider);
    const signingData = this.getSigningData();
    this.depositProofOutput.signature = await ethSigner.signPersonalMessage(signingData, this.depositor);
  }

  public isSignatureValid() {
    if (!this.depositProofOutput) {
      throw new Error('Call createProof() and sign() first.');
    }
    if (!this.depositProofOutput.signature) {
      throw new Error('Call sign() first.');
    }

    const signingData = this.getSigningData();
    return validateSignature(this.depositor, this.depositProofOutput.signature, signingData);
  }

  private async getPendingFundsStatus() {
    const { assetId } = this.publicInput;
    const pendingDeposit = await this.blockchain.getUserPendingDeposit(assetId, this.depositor);
    const txs = await this.core.getPendingDepositTxs();
    const unsettledDeposit = txs
      .filter(tx => tx.assetId === assetId && tx.publicOwner.equals(this.depositor))
      .reduce((sum, tx) => sum + BigInt(tx.value), BigInt(0));
    const pendingFunds = pendingDeposit - unsettledDeposit;
    const { value } = this.publicInput;
    const requiredFunds = pendingFunds < value ? value - pendingFunds : BigInt(0);
    return { ...this.pendingFundsStatus, pendingDeposit, pendingFunds, requiredFunds };
  }

  private async createPermitArgs(value: bigint, permitDeadline?: bigint) {
    const deadline = permitDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 5 * 60); // Default deadline is 5 mins from now.
    const { assetId } = this.publicInput;
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.depositor);
    const { permitHelperContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitData(
      asset.getStaticInfo().name,
      this.depositor,
      permitHelperContractAddress,
      value,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      this.getContractChainId(chainId),
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.depositor);
    return { signature, deadline };
  }

  private async createPermitArgsNonStandard(permitDeadline?: bigint) {
    const deadline = permitDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 5 * 60); // Default deadline is 5 mins from now.
    const { assetId } = this.publicInput;
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.depositor);
    const { permitHelperContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitDataNonStandard(
      asset.getStaticInfo().name,
      this.depositor,
      permitHelperContractAddress,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      this.getContractChainId(chainId),
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.depositor);
    return { signature, deadline, nonce };
  }

  private getContractChainId(chainId: number) {
    // Any references to the chainId in the contracts on mainnet-fork (like the DOMAIN_SEPARATOR for permit data)
    // will have to be 1.
    switch (chainId) {
      case 0xa57ec:
      case 0xdef:
      case 0xe2e:
        return 1;
      default:
        return chainId;
    }
  }

  private async sendTransactionAndCheckOnchainData(
    name: string,
    sendTx: () => Promise<TxHash>,
    checkOnchainData: () => Promise<boolean>,
    timeout?: number,
    interval = 1,
  ) {
    const interruptableSleep = new InterruptableSleep();
    let txHash: TxHash | undefined;
    let txError: Error | undefined;

    // May never return due to wallet connect provider bugs.
    void (async () => {
      try {
        txHash = await sendTx();
      } catch (e: any) {
        txError = e;
      }
      interruptableSleep.interrupt();
    })();

    const timer = new Timer();
    while (!txHash && !txError) {
      // We want confidence the tx will be accepted, so simulate waiting for confirmations.
      if (await checkOnchainData()) {
        const secondsTillConfirmed = (this.blockchain.minConfirmations - 1) * 15;
        await sleep(secondsTillConfirmed * 1000);
        break;
      }

      await interruptableSleep.sleep(interval * 1000);

      if (timeout && timer.s() > timeout) {
        throw new Error(`Timeout awaiting chain state condition: ${name}`);
      }
    }

    if (txError) {
      throw txError;
    }

    return txHash;
  }

  private async awaitTransaction(
    name: string,
    confirmedFromOnchainData: () => Promise<boolean>,
    timeout?: number,
    interval = 1,
  ) {
    await retryUntil(confirmedFromOnchainData, `chain state condition: ${name}`, timeout, interval);

    // We want confidence the tx will be accepted, so simulate waiting for confirmations.
    const secondsTillConfirmed = (this.blockchain.minConfirmations - 1) * 15;
    await sleep(secondsTillConfirmed * 1000);
  }
}

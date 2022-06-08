import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
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
import { createTxRefNo } from './create_tx_ref_no';
import { FeePayer } from './fee_payer';

export class DepositController {
  private readonly publicInput: AssetValue;
  private proofOutput?: ProofOutput;
  private feeProofOutput?: ProofOutput;
  private txId?: TxId;
  private pendingFunds?: bigint;

  constructor(
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientAccountRequired: boolean,
    public readonly feePayer: FeePayer | undefined,
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
    const requireFeePayingTx = fee.value && fee.assetId !== assetId;
    if (requireFeePayingTx && !feePayer) {
      throw new Error('Fee payer not provided.');
    }

    this.publicInput = { assetId, value: value + (fee.assetId === assetId ? fee.value : BigInt(0)) };
  }

  public async getPendingFunds() {
    if (this.pendingFunds === undefined) {
      const pendingDeposit = await this.blockchain.getUserPendingDeposit(this.publicInput.assetId, this.depositor);
      const txs = await this.core.getRemoteUnsettledPaymentTxs();
      const unsettledDeposit = txs
        .filter(
          tx =>
            tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
            tx.proofData.publicAssetId === this.publicInput.assetId &&
            tx.proofData.publicOwner.equals(this.depositor),
        )
        .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), BigInt(0));
      this.pendingFunds = pendingDeposit - unsettledDeposit;
    }
    return this.pendingFunds;
  }

  public async getRequiredFunds() {
    const pendingFunds = await this.getPendingFunds();
    const { value } = this.publicInput;
    return pendingFunds < value ? value - pendingFunds : BigInt(0);
  }

  public async getPublicAllowance() {
    const { assetId } = this.publicInput;
    const { rollupContractAddress } = await this.core.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(this.depositor, rollupContractAddress);
  }

  public async hasPermitSupport() {
    const { assetId } = this.publicInput;
    return this.blockchain.hasPermitSupport(assetId);
  }

  public async approve() {
    const requiredFunds = await this.getRequiredFunds();
    if (!requiredFunds) {
      throw new Error('User has deposited enough funds.');
    }

    const { assetId } = this.publicInput;
    const { rollupContractAddress } = await this.core.getLocalStatus();
    return await this.blockchain
      .getAsset(assetId)
      .approve(requiredFunds, this.depositor, rollupContractAddress, { provider: this.provider });
  }

  public async awaitApprove(timeout?: number, interval?: number) {
    const requiredFunds = await this.getRequiredFunds();
    if (!requiredFunds) {
      throw new Error('User has deposited enough funds.');
    }

    const checkOnchainData = async () => {
      const allowance = await this.getPublicAllowance();
      return allowance >= requiredFunds;
    };
    await this.awaitTransaction('approval allowance', checkOnchainData, timeout, interval);
  }

  public async depositFundsToContract(permitDeadline?: bigint) {
    const permitSupport = await this.hasPermitSupport();
    if (!permitSupport) {
      return await this.depositFundsToContractWithApprove();
    } else {
      return await this.depositFundsToContractWithPermit(permitDeadline);
    }
  }

  public async depositFundsToContractWithApprove() {
    const value = await this.getRequiredFunds();
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const isContract = await this.blockchain.isContract(this.depositor);
    const proofHash = isContract ? this.getProofHash() : undefined;
    const { assetId } = this.publicInput;
    return await this.blockchain.depositPendingFunds(assetId, value, proofHash, {
      signingAddress: this.depositor,
      provider: this.provider,
    });
  }

  public async depositFundsToContractWithPermit(deadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60)) {
    if (!(await this.hasPermitSupport())) {
      throw new Error('Deposit asset does not support permit.');
    }

    const value = await this.getRequiredFunds();
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const isContract = await this.blockchain.isContract(this.depositor);
    const proofHash = isContract ? this.getProofHash() : undefined;
    const { assetId } = this.publicInput;
    const { signature } = await this.createPermitArgs(value, deadline);
    return await this.blockchain.depositPendingFundsPermit(assetId, value, deadline, signature, proofHash, {
      signingAddress: this.depositor,
      provider: this.provider,
    });
  }

  public async depositFundsToContractWithNonStandardPermit(
    permitDeadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60),
  ) {
    const value = await this.getRequiredFunds();
    if (!value) {
      throw new Error('User has deposited enough funds.');
    }

    const isContract = await this.blockchain.isContract(this.depositor);
    const proofHash = isContract ? this.getProofHash() : undefined;
    const deadline = permitDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 5 * 60); // Default deadline is 5 mins from now.
    const { signature, nonce } = await this.createPermitArgsNonStandard(deadline);
    const { assetId } = this.publicInput;
    return await this.blockchain.depositPendingFundsPermitNonStandard(
      assetId,
      value,
      nonce,
      deadline,
      signature,
      proofHash,
      {
        signingAddress: this.depositor,
        provider: this.provider,
      },
    );
  }

  public async awaitDepositFundsToContract(timeout?: number, interval?: number) {
    const { assetId } = this.publicInput;
    const checkOnchainData = async () => {
      const value = await this.blockchain.getUserPendingDeposit(assetId, this.depositor);
      return value >= this.publicInput.value;
    };
    await this.awaitTransaction('deposit funds to contract', checkOnchainData, timeout, interval);
  }

  public async createProof(txRefNo = 0) {
    const { assetId, value } = this.publicInput;
    const requireFeePayingTx = !!this.fee.value && this.fee.assetId !== assetId;
    const privateOutput = requireFeePayingTx ? value : value - this.fee.value;
    if (requireFeePayingTx && !txRefNo) {
      txRefNo = createTxRefNo();
    }

    this.proofOutput = await this.core.createDepositProof(
      assetId,
      value, // publicInput,
      privateOutput,
      this.depositor,
      this.recipient,
      this.recipientAccountRequired,
      txRefNo,
    );

    if (requireFeePayingTx) {
      const { userId, signer } = this.feePayer!;
      const spendingPublicKey = signer.getPublicKey();
      const accountRequired = !spendingPublicKey.equals(userId);
      const feeProofInput = await this.core.createPaymentProofInput(
        userId,
        this.fee.assetId,
        BigInt(0),
        BigInt(0),
        this.fee.value,
        BigInt(0),
        BigInt(0),
        userId,
        accountRequired,
        undefined,
        spendingPublicKey,
        2,
      );
      feeProofInput.signature = await signer.signMessage(feeProofInput.signingData);
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
    return !!(await this.blockchain.getUserProofApprovalStatus(this.depositor, proofHash));
  }

  public async approveProof() {
    const proofHash = this.getProofHash();
    return await this.blockchain.approveProof(proofHash, {
      signingAddress: this.depositor,
      provider: this.provider,
    });
  }

  public async awaitApproveProof(timeout?: number, interval?: number) {
    const checkOnchainData = async () => this.isProofApproved();
    await this.awaitTransaction('approve proof', checkOnchainData, timeout, interval);
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
    this.proofOutput.signature = await ethSigner.signMessage(signingData, this.depositor);
  }

  public isSignatureValid() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() and sign() first.');
    }
    if (!this.proofOutput.signature) {
      throw new Error('Call sign() first.');
    }

    const signingData = this.getSigningData();
    return validateSignature(this.depositor, this.proofOutput.signature, signingData);
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

  private async createPermitArgs(value: bigint, deadline: bigint) {
    const { assetId } = this.publicInput;
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.depositor);
    const { rollupContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitData(
      asset.getStaticInfo().name,
      this.depositor,
      rollupContractAddress,
      value,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      this.getContractChainId(chainId),
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.depositor);
    return { signature };
  }

  private async createPermitArgsNonStandard(deadline: bigint) {
    const { assetId } = this.publicInput;
    const asset = this.blockchain.getAsset(assetId);
    const nonce = await asset.getUserNonce(this.depositor);
    const { rollupContractAddress, chainId } = await this.core.getLocalStatus();
    const permitData = createPermitDataNonStandard(
      asset.getStaticInfo().name,
      this.depositor,
      rollupContractAddress,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      this.getContractChainId(chainId),
    );
    const ethSigner = new Web3Signer(this.provider);
    const signature = await ethSigner.signTypedData(permitData, this.depositor);
    return { signature, nonce };
  }

  private getContractChainId(chainId: number) {
    // Any references to the chainId in the contracts on mainnet-fork (like the DOMAIN_SEPARATOR for permit data)
    // will have to be 1.
    switch (chainId) {
      case 0xa57ec:
      case 0xe2e:
        return 1;
      default:
        return chainId;
    }
  }

  private async awaitTransaction(
    name: string,
    checkOnchainData: () => Promise<boolean>,
    timeout?: number,
    interval = 1,
  ) {
    const timer = new Timer();
    while (true) {
      // We want confidence the tx will be accepted, so simulate waiting for confirmations.
      if (await checkOnchainData()) {
        const secondsTillConfirmed = (this.blockchain.minConfirmations - 1) * 15;
        await sleep(secondsTillConfirmed * 1000);
        return true;
      }

      await sleep(interval * 1000);

      if (timeout && timer.s() > timeout) {
        throw new Error(`Timeout awaiting chain state condition: ${name}`);
      }
    }
  }
}

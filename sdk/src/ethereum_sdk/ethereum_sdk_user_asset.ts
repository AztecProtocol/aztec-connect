import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { PermitArgs, TxType } from '@aztec/barretenberg/blockchain';
import { ProofOutput } from '../proofs/proof_output';
import { AccountId } from '../user';
import { EthereumSdk } from './';

export class EthereumSdkUserAsset {
  constructor(
    private address: EthAddress,
    private accountId: AccountId,
    private assetId: AssetId,
    private sdk: EthereumSdk,
  ) {}

  getInfo() {
    return this.sdk.getAssetInfo(this.assetId);
  }

  async publicBalance() {
    return this.sdk.getPublicBalance(this.assetId, this.address);
  }

  async publicAllowance() {
    return this.sdk.getPublicAllowance(this.assetId, this.address);
  }

  async pendingDeposit() {
    return this.sdk.getUserPendingDeposit(this.assetId, this.address);
  }

  balance() {
    return this.sdk.getBalance(this.assetId, this.accountId);
  }

  async getMaxSpendableValue() {
    return this.sdk.getMaxSpendableValue(this.assetId, this.accountId);
  }

  async mint(value: bigint) {
    return this.sdk.mint(this.assetId, value, this.address);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.assetId, value, this.address);
  }

  async depositFundsToContract(value: bigint, permitArgs?: PermitArgs) {
    return this.sdk.depositFundsToContract(this.assetId, this.address, value, undefined, permitArgs);
  }

  async createDepositProof(value: bigint, fee: bigint) {
    return this.sdk.createDepositProof(this.assetId, this.address, this.accountId, value, fee);
  }

  async createWithdrawProof(value: bigint, fee: bigint) {
    return this.sdk.createWithdrawProof(this.assetId, this.accountId, this.address, value, fee);
  }

  async createTransferProof(value: bigint, fee: bigint, to: AccountId) {
    return this.sdk.createTransferProof(this.assetId, this.accountId, to, value, fee);
  }

  async signProof(proofOutput: ProofOutput) {
    return this.sdk.signProof(proofOutput, this.address);
  }

  public fromBaseUnits(value: bigint, precision?: number) {
    return this.sdk.fromBaseUnits(this.assetId, value, precision);
  }

  public toBaseUnits(value: string) {
    return this.sdk.toBaseUnits(this.assetId, value);
  }

  public async getFee(txType: TxType) {
    return this.sdk.getFee(this.assetId, txType);
  }
}

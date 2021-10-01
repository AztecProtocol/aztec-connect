import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { PermitArgs, TxType } from '@aztec/barretenberg/blockchain';
import { Signer } from '../signer';
import { AccountId } from '../user';
import { WalletSdk } from '.';

export class WalletSdkUserAsset {
  constructor(public userId: AccountId, public assetId: AssetId, private sdk: WalletSdk) {}

  info() {
    return this.sdk.getAssetInfo(this.assetId);
  }

  balance() {
    return this.sdk.getBalance(this.assetId, this.userId);
  }

  async publicBalance(account: EthAddress) {
    return this.sdk.getPublicBalance(this.assetId, account);
  }

  async publicAllowance(account: EthAddress) {
    return this.sdk.getPublicAllowance(this.assetId, account);
  }

  async pendingDeposit(account: EthAddress) {
    return this.sdk.getUserPendingDeposit(this.assetId, account);
  }

  async getMaxSpendableValue() {
    return this.sdk.getMaxSpendableValue(this.assetId, this.userId);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.assetId, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.assetId, value, account);
  }

  async depositFundsToContract(from: EthAddress, value: bigint, proofHash: Buffer, permitArgs?: PermitArgs) {
    return this.sdk.depositFundsToContract(this.assetId, from, value, proofHash, permitArgs);
  }

  async createDepositProof(value: bigint, fee: bigint, signer: Signer, from: EthAddress) {
    return this.sdk.createDepositProof(this.assetId, from, this.userId, value, fee, signer);
  }

  async createWithdrawProof(value: bigint, fee: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.createWithdrawProof(this.assetId, this.userId, value, fee, signer, to);
  }

  async createTransferProof(value: bigint, fee: bigint, signer: Signer, to: AccountId) {
    return this.sdk.createTransferProof(this.assetId, this.userId, value, fee, signer, to);
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

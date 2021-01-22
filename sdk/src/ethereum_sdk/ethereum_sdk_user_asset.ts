import { AssetId } from 'barretenberg/client_proofs';
import { Signer } from '../signer';
import { AccountId } from '../user';
import { JoinSplitTxOptions } from '../wallet_sdk/tx_options';
import { EthereumSdk } from './';
import { EthUserId } from './eth_user_id';

export class EthereumSdkUserAsset {
  constructor(public ethUserId: EthUserId, public id: AssetId, private sdk: EthereumSdk) {}

  name() {
    return this.sdk.getAssetName(this.id);
  }

  symbol() {
    return this.sdk.getAssetSymbol(this.id);
  }

  publicBalance() {
    return this.sdk.getPublicBalance(this.id, this.ethUserId.ethAddress);
  }

  publicAllowance() {
    return this.sdk.getPublicAllowance(this.id, this.ethUserId.ethAddress);
  }

  getUserPendingDeposit() {
    return this.sdk.getUserPendingDeposit(this.id, this.ethUserId.ethAddress);
  }

  getPermitSupport() {
    return this.sdk.getAssetPermitSupport(this.id);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.ethUserId);
  }

  async mint(value: bigint) {
    return this.sdk.mint(this.id, value, this.ethUserId);
  }

  async approve(value: bigint) {
    return this.sdk.approve(this.id, value, this.ethUserId);
  }

  async deposit(value: bigint, fee: bigint, signer?: Signer) {
    return this.sdk.deposit(this.id, this.ethUserId, value, fee, signer);
  }

  async withdraw(value: bigint, fee: bigint, signer?: Signer) {
    return this.sdk.withdraw(this.id, this.ethUserId, value, fee, signer);
  }

  async transfer(value: bigint, fee: bigint, to: AccountId, signer?: Signer) {
    return this.sdk.transfer(this.id, this.ethUserId, value, fee, to, signer);
  }

  async joinSplit(
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    signer: Signer,
    options?: JoinSplitTxOptions,
  ) {
    return this.sdk.joinSplit(
      this.id,
      this.ethUserId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      signer,
      options,
    );
  }

  public fromBaseUnits(value: bigint, precision?: number) {
    return this.sdk.fromBaseUnits(this.id, value, precision);
  }

  public toBaseUnits(value: string) {
    return this.sdk.toBaseUnits(this.id, value);
  }

  public async getFee() {
    return this.sdk.getFee(this.id);
  }
}

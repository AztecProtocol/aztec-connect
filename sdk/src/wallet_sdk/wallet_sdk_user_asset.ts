import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/client_proofs';
import { EthereumSigner, Signer } from '../signer';
import { AccountId } from '../user';
import { JoinSplitTxOptions } from './tx_options';
import { WalletSdk } from '.';
import { PermitArgs } from 'blockchain';

export class WalletSdkUserAsset {
  constructor(public userId: AccountId, public id: AssetId, private sdk: WalletSdk) {}

  name() {
    return this.sdk.getAssetName(this.id);
  }

  symbol() {
    return this.sdk.getAssetSymbol(this.id);
  }

  async publicBalance(ethAddress: EthAddress) {
    return this.sdk.getPublicBalance(this.id, ethAddress);
  }

  async publicAllowance(ethAddress: EthAddress) {
    return this.sdk.getPublicAllowance(this.id, ethAddress);
  }

  balance() {
    return this.sdk.getBalance(this.id, this.userId);
  }

  async mint(value: bigint, account: EthAddress) {
    return this.sdk.mint(this.id, this.userId, value, account);
  }

  async approve(value: bigint, account: EthAddress) {
    return this.sdk.approve(this.id, this.userId, value, account);
  }

  async deposit(value: bigint, fee: bigint, signer: Signer, ethSigner: EthereumSigner, permitArgs?: PermitArgs) {
    return this.sdk.deposit(this.id, this.userId, value, fee, signer, ethSigner, permitArgs);
  }

  async withdraw(value: bigint, fee: bigint, signer: Signer, to: EthAddress) {
    return this.sdk.withdraw(this.id, this.userId, value, fee, signer, to);
  }

  async transfer(value: bigint, fee: bigint, signer: Signer, to: AccountId) {
    return this.sdk.transfer(this.id, this.userId, value, fee, signer, to);
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
      this.userId,
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

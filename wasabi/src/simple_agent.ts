import { Signer, Wallet } from 'ethers';
import {
  WalletSdk,
  WalletProvider,
  SchnorrSigner,
  AssetId,
  EthAddress,
  toBaseUnits,
  WalletSdkUser,
  WalletSdkUserAsset,
  MemoryFifo,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { Agent } from './agent';

export class SimpleAgent extends Agent {
  private wallet: Wallet;
  private address: EthAddress;
  private signer!: SchnorrSigner;
  private user!: WalletSdkUser;
  private userAsset!: WalletSdkUserAsset;

  constructor(
    sdk: WalletSdk,
    provider: WalletProvider,
    private masterWallet: Signer,
    id: number,
    queue: MemoryFifo<() => Promise<void>>,
  ) {
    super(sdk, id, queue);
    this.wallet = Wallet.createRandom();
    this.address = provider.addEthersWallet(this.wallet);
  }

  public async run() {
    const privateKey = randomBytes(32);
    this.user = await this.sdk.addUser(privateKey, undefined, true);
    this.userAsset = this.user.getAsset(AssetId.ETH);
    this.signer = this.user.getSigner();

    while (true) {
      try {
        await this.fundAccount();
        await this.serialize(this.transfer);
      } catch (err) {
        console.log(err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async fundAccount() {
    // Nothing to do if we have a balance.
    if (this.sdk.getBalance(AssetId.ETH, this.user.id)) {
      return;
    }

    await this.fundEthAddress();
    await this.depositToContract();
    await this.serialize(this.deposit);
  }

  private async fundEthAddress() {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('0.01', 18);
    if (balance >= toFund) {
      return;
    }

    const value = toFund - balance;
    console.log(`Agent ${this.id} funding ${this.address} with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    await this.masterWallet.provider!.waitForTransaction(hash);
  }

  private async depositToContract() {
    console.log(`Agent ${this.id} depositing to contract...`);
    const txHash = await this.sdk.depositFundsToContract(AssetId.ETH, this.address, 1n);
    await this.masterWallet.provider!.waitForTransaction(txHash.toString());
  }

  private deposit = async () => {
    console.log(`Agent ${this.id} depositing...`);
    return await this.userAsset.deposit(1n, 0n, this.signer, this.address);
  };

  private transfer = async () => {
    console.log(`Agent ${this.id} transferring...`);
    return await this.userAsset.transfer(1n, 0n, this.signer, this.user.id);
  };
}

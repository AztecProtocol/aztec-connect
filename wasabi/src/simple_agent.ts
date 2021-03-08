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
  TxType,
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
    private loop: boolean,
  ) {
    super(sdk, id, queue);
    this.wallet = Wallet.createRandom();
    this.address = provider.addEthersWallet(this.wallet);
  }

  private getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  public async run() {
    const privateKey = randomBytes(32);
    this.user = await this.sdk.addUser(privateKey, undefined, true);
    this.userAsset = this.user.getAsset(AssetId.ETH);
    this.signer = this.user.getSigner();
    const numTransfers = 5 + this.getRandomInt(10);
    do {
      try {
        await this.fundAccount(numTransfers);

        for (let i = 0; i < numTransfers; i++) {
          await this.serialize(this.transfer);
        }
        await this.serialize(this.withdraw);
      } catch (err) {
        console.log(err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (this.loop);
  }

  private async fundAccount(numTransfers: number) {
    // Nothing to do if we have a balance.
    if (this.sdk.getBalance(AssetId.ETH, this.user.id)) {
      return;
    }
    const depositFee = await this.userAsset.getFee(TxType.DEPOSIT);
    const transferFee = await this.userAsset.getFee(TxType.TRANSFER);
    const withdrawFee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);

    const totalDeposit = 1n + depositFee + BigInt(numTransfers) * transferFee + withdrawFee;
    await this.fundEthAddress(totalDeposit);
    await this.depositToContract(totalDeposit);
    await this.serialize(this.deposit);
  }

  private async fundEthAddress(deposit: bigint) {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('1', 16);
    const required = toFund + deposit;

    if (balance >= required) {
      return;
    }

    const value = required - balance;
    console.log(`Agent ${this.id} funding ${this.address} with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    await this.masterWallet.provider!.waitForTransaction(hash);
  }

  private async depositToContract(deposit: bigint) {
    console.log(`Agent ${this.id} depositing to contract...`);
    const txHash = await this.sdk.depositFundsToContract(AssetId.ETH, this.address, deposit);
    await this.masterWallet.provider!.waitForTransaction(txHash.toString());
  }

  private deposit = async () => {
    console.log(`Agent ${this.id} depositing...`);
    const fee = await this.userAsset.getFee(TxType.DEPOSIT);
    const pendingDeposit = await this.sdk.getUserPendingDeposit(AssetId.ETH, this.address);
    return await this.userAsset.deposit(pendingDeposit - fee, fee, this.signer, this.address);
  };

  private transfer = async () => {
    console.log(`Agent ${this.id} transferring...`);
    const fee = await this.userAsset.getFee(TxType.TRANSFER);
    const balance = this.userAsset.balance();
    return await this.userAsset.transfer(balance - fee, fee, this.signer, this.user.id);
  };

  private withdraw = async () => {
    console.log(`Agent ${this.id} withdrawing...`);
    const masterAddress = await this.masterWallet.getAddress();
    const fee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
    const balance = this.userAsset.balance();
    return await this.userAsset.withdraw(balance - fee, fee, this.signer, EthAddress.fromString(masterAddress));
  };
}

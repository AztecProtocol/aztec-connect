import { Signer, Wallet } from 'ethers';
import {
  WalletSdk,
  WalletProvider,
  SchnorrSigner,
  AssetId,
  EthAddress,
  toBaseUnits,
  WalletSdkUser,
  MemoryFifo,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { Agent } from './agent';

export class DepositingAgent extends Agent {
  private address: EthAddress;
  private signer!: SchnorrSigner;
  private user!: WalletSdkUser;

  constructor(
    sdk: WalletSdk,
    provider: WalletProvider,
    private masterWallet: Signer,
    private wallet: Wallet,
    id: number,
    queue: MemoryFifo<() => Promise<void>>,
  ) {
    super(sdk, id, queue);
    this.address = provider.addEthersWallet(this.wallet);
  }

  public async run() {
    const privateKey = randomBytes(32);
    this.user = await this.sdk.addUser(privateKey, undefined, true);
    this.signer = this.user.getSigner();

    while (true) {
      try {
        const pending = await this.sdk.getUserPendingDeposit(AssetId.ETH, this.address);
        if (pending === 0n) {
          await this.fund();
          await this.depositToContract();
        }
        await this.deposit();
      } catch (err: any) {
        console.log(err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async fund() {
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('0.01', 18);

    if (balance >= toFund) {
      return;
    }

    const value = toFund - balance;
    console.log(`Agent ${this.id} funding with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    await this.masterWallet.provider!.waitForTransaction(hash);
  }

  private async depositToContract() {
    console.log(`Agent ${this.id} depositing to contract...`);
    const value = 1000n;
    const txHash = await this.sdk.depositFundsToContract(AssetId.ETH, this.address, value);
    await this.masterWallet.provider!.waitForTransaction(txHash.toString());
  }

  private deposit = async () => {
    console.log(`Agent ${this.id} depositing...`);
    const value = 1n;
    const proof = await this.sdk.createDepositProof(AssetId.ETH, this.address, this.user.id, value, 0n, this.signer);
    const signature = await this.sdk.signProof(proof, this.address);
    await this.sdk.sendProof(proof, signature);
  };
}

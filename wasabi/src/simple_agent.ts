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
    super('Simple', sdk, id, queue);
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
        await this.serializeTx(() => this.fundAccount(numTransfers));

        for (let i = 0; i < numTransfers; i++) {
          await this.serializeTx(this.transfer);
        }
        await this.serializeTx(this.withdraw);
      } catch (err: any) {
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

    //console.log(`deposit: ${depositFee}, transfer: ${transferFee}, withdraw: ${withdrawFee}`);

    const totalDeposit = 1n + depositFee + BigInt(numTransfers) * transferFee + withdrawFee;
    await this.fundEthAddress(totalDeposit);
    await this.depositToContract(totalDeposit);
    return await this.deposit();
  }

  private async fundEthAddress(deposit: bigint) {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('2', 16);
    const required = toFund + deposit;

    //console.log(`balance: ${balance}, to fund: ${toFund}, required: ${required}`);

    if (balance >= required) {
      return;
    }

    const value = required - balance;
    console.log(`${this.agentId()} funding ${this.address} with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    console.log(`${this.agentId()} transaction sent`);
    await this.masterWallet.provider!.waitForTransaction(hash);
    console.log(`${this.agentId()} transaction completed`);
  }

  private async depositToContract(deposit: bigint) {
    console.log(`${this.agentId()} depositing to contract...`);
    await this.sdk.depositFundsToContract(AssetId.ETH, this.address, deposit);
    console.log(`${this.agentId()} deposit completed`);
  }

  private deposit = async () => {
    console.log(`${this.agentId()} depositing...`);
    const fee = await this.userAsset.getFee(TxType.DEPOSIT);
    const pendingDeposit = await this.userAsset.pendingDeposit(this.address);
    const proof = await this.userAsset.createDepositProof(pendingDeposit - fee, fee, this.signer, this.address);
    const signature = await this.sdk.signProof(proof, this.address);
    return await this.sdk.sendProof(proof, signature);
  };

  private transfer = async () => {
    console.log(`${this.agentId()} transferring...`);
    const fee = await this.userAsset.getFee(TxType.TRANSFER);
    const balance = this.userAsset.balance();
    const proof = await this.userAsset.createTransferProof(balance - fee, fee, this.signer, this.user.id);
    return await this.sdk.sendProof(proof);
  };

  private withdraw = async () => {
    console.log(`${this.agentId()} withdrawing...`);
    const masterAddress = await this.masterWallet.getAddress();
    const fee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
    const balance = this.userAsset.balance();
    const proof = await this.userAsset.createWithdrawProof(
      balance - fee,
      fee,
      this.signer,
      EthAddress.fromString(masterAddress),
    );
    return await this.sdk.sendProof(proof);
  };
}

import {
  MemoryFifo,
  TxHash,
  WalletSdk,
  EthAddress,
  WalletProvider,
  WalletSdkUser,
  WalletSdkUserAsset,
  SchnorrSigner,
  AssetId,
  toBaseUnits,
  TxType,
  EthAsset,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { Stats } from './stats';

export const TX_SETTLEMENT_TIMEOUT = 12 * 3600;

export abstract class Agent {
  protected address!: EthAddress;
  protected signer!: SchnorrSigner;
  protected user!: WalletSdkUser;
  protected userAsset!: WalletSdkUserAsset;
  public depositPromise?: Promise<void>;
  private depositSent!: () => void;
  protected payoutFee: bigint = toBaseUnits('420', 12);
  protected depositFee?: bigint;

  constructor(
    protected type: string,
    protected fundsSourceAddress: EthAddress,
    protected sdk: WalletSdk,
    protected id: number,
    protected provider: WalletProvider,
    private queue: MemoryFifo<() => Promise<void>>,
  ) {
    this.depositPromise = new Promise(resolve => {
      this.depositSent = resolve;
    });
  }

  public async setup(depositFee?: bigint) {
    this.depositFee = depositFee;
    const privateKey = randomBytes(32);
    this.address = this.provider.addAccount(privateKey);
    this.user = await this.sdk.addUser(privateKey, undefined, true);
    this.userAsset = this.user.getAsset(AssetId.ETH);
    this.signer = this.user.getSigner();
  }

  private async fundEthAddress(deposit: bigint) {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    const toFund = toBaseUnits('2', 18);
    const required = toFund + deposit;

    if (balance >= required) {
      return;
    }

    const value = required - balance;
    console.log(`${this.agentId()} funding ${this.address} with ${value} wei...`);

    const asset: EthAsset = new EthAsset(this.provider);
    console.log(`${this.agentId()} transaction sent`);
    await asset.transfer(value, this.fundsSourceAddress, this.address);
    console.log(
      `${this.agentId()} transaction completed, new balance: ${await this.sdk.getPublicBalance(
        AssetId.ETH,
        this.address,
      )}`,
    );
  }

  public async repaySourceAddress() {
    let balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);
    balance -= this.payoutFee;

    console.log(`${this.agentId()} funding ${this.fundsSourceAddress} with ${balance} wei...`);
    const asset: EthAsset = new EthAsset(this.provider);
    console.log(`${this.agentId()} transaction sent`);
    await asset.transfer(balance, this.address, this.fundsSourceAddress);
    console.log(
      `${this.agentId()} transaction completed, new balance: ${await this.sdk.getPublicBalance(
        AssetId.ETH,
        this.address,
      )}`,
    );
  }

  private async depositToContract(deposit: bigint) {
    console.log(`${this.agentId()} depositing to contract...`);
    await this.sdk.depositFundsToContract(AssetId.ETH, this.address, deposit);
    console.log(`${this.agentId()} deposit completed`);
  }

  protected abstract getInitialDeposit(): Promise<bigint | undefined>;

  public async depositToRollup() {
    const deposit = await this.getInitialDeposit();
    if (!deposit) {
      return;
    }
    await this.fundEthAddress(deposit);
    await this.depositToContract(deposit);
  }

  public completePendingDeposit = async () => {
    const fee = this.depositFee ?? (await this.userAsset.getFee(TxType.DEPOSIT));
    console.log(`${this.agentId()} sending pending deposit with fee ${fee}...`);
    const pendingDeposit = await this.userAsset.pendingDeposit(this.address);
    const proof = await this.userAsset.createDepositProof(pendingDeposit - fee, fee, this.signer, this.address);
    const signature = await this.sdk.signProof(proof, this.address);
    const hash = await this.sdk.sendProof(proof, signature);
    this.depositSent();
    return hash;
  };

  protected withdraw = async () => {
    console.log(`${this.agentId()} withdrawing...`);
    const fee = await this.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
    const balance = this.userAsset.balance();
    console.log(`${this.agentId()} withdrawing ${balance} WEI to wallet`);
    const proof = await this.userAsset.createWithdrawProof(balance - fee, fee, this.signer, this.fundsSourceAddress);
    return await this.sdk.sendProof(proof);
  };

  /**
   * The SDK does not support parallel execution.
   * Given a function that resolves to a TxHash, will execute that function in serial across all agents sharing the
   * queue. Resolves when the TxHash is settled.
   */
  protected async serializeTx(fn: () => Promise<TxHash | undefined>) {
    const txHash = await this.serializeAny(fn);
    if (!txHash) {
      return;
    }
    console.log(`Agent ${this.id} awaiting settlement...`);
    await this.sdk.awaitSettlement(txHash, TX_SETTLEMENT_TIMEOUT);
  }

  protected async serializeAny(fn: () => Promise<any>) {
    return await new Promise<any>((resolve, reject) => this.queue.put(() => fn().then(resolve).catch(reject)));
  }

  protected agentId() {
    return `${this.type} agent ${this.id}`;
  }

  abstract run(stats: Stats): Promise<void>;
}

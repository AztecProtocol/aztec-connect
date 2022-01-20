import {
  MemoryFifo,
  TxHash,
  WalletSdk,
  EthAddress,
  WalletProvider,
  WalletSdkUser,
  SchnorrSigner,
  AssetId,
  toBaseUnits,
  EthAsset,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { Stats } from './stats';

export const TX_SETTLEMENT_TIMEOUT = 12 * 3600;

export class UserData {
  constructor(public address: EthAddress, public signer: SchnorrSigner, public user: WalletSdkUser) {}
}

export abstract class Agent {
  protected users: UserData[] = [];
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
    protected assetId = AssetId.ETH,
  ) {
    this.depositPromise = new Promise(resolve => {
      this.depositSent = resolve;
    });
  }

  protected abstract getNumAdditionalUsers(): number;

  private async createUser() {
    const privateKey = randomBytes(32);
    const address = this.provider.addAccount(privateKey);
    const user = await this.sdk.addUser(privateKey, undefined, true);
    const signer = this.sdk.createSchnorrSigner(privateKey);
    return new UserData(address, signer, user);
  }

  public async setup(depositFee?: bigint) {
    this.depositFee = depositFee;
    this.users.push(await this.createUser());

    for (let i = 0; i < this.getNumAdditionalUsers(); i++) {
      this.users.push(await this.createUser());
    }
  }

  get primaryUser() {
    return this.users[0];
  }

  private async fundEthAddress(deposit: bigint) {
    // Fund enough to ensure we can pay tx fee to deposit to contract.
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.primaryUser.address);
    const toFund = toBaseUnits('2', 18);
    const required = toFund + deposit;

    if (balance >= required) {
      return;
    }

    const value = required - balance;
    console.log(`${this.agentId()} funding ${this.primaryUser.address} with ${value} wei...`);

    const asset: EthAsset = new EthAsset(this.provider);
    console.log(`${this.agentId()} transaction sent`);
    await asset.transfer(value, this.fundsSourceAddress, this.primaryUser.address);
    console.log(
      `${this.agentId()} transaction completed, new balance: ${await this.sdk.getPublicBalance(
        AssetId.ETH,
        this.primaryUser.address,
      )}`,
    );
  }

  public async repaySourceAddress() {
    let balance = await this.sdk.getPublicBalance(AssetId.ETH, this.primaryUser.address);
    balance -= this.payoutFee;

    console.log(`${this.agentId()} funding ${this.fundsSourceAddress} with ${balance} wei...`);
    const asset: EthAsset = new EthAsset(this.provider);
    console.log(`${this.agentId()} transaction sent`);
    await asset.transfer(balance, this.primaryUser.address, this.fundsSourceAddress);
    console.log(
      `${this.agentId()} transaction completed, new balance: ${await this.sdk.getPublicBalance(
        AssetId.ETH,
        this.primaryUser.address,
      )}`,
    );
  }

  private async depositToContract(deposit: bigint) {
    console.log(`${this.agentId()} depositing to contract...`);
    await this.sdk.depositFundsToContract({ assetId: AssetId.ETH, value: deposit }, this.primaryUser.address);
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
    const { user, signer, address } = this.primaryUser;
    const fee = this.depositFee
      ? { assetId: this.assetId, value: this.depositFee }
      : (await this.sdk.getDepositFees(this.assetId))[0];
    console.log(`${this.agentId()} sending pending deposit with fee ${fee.value}...`);
    const pendingDeposit = await this.sdk.getUserPendingDeposit(this.assetId, address);
    const value = pendingDeposit - fee.value;
    const controller = this.sdk.createDepositController(
      user.id,
      signer,
      { assetId: this.assetId, value },
      fee,
      address,
    );
    await controller.createProof();
    await controller.sign();
    const hash = await controller.send();
    this.depositSent();
    return hash;
  };

  protected withdraw = async () => {
    console.log(`${this.agentId()} withdrawing...`);
    const { user, signer } = this.primaryUser;
    const [fee] = await this.sdk.getWithdrawFees(this.assetId);
    const balance = user.getBalance(this.assetId);
    const value = balance - fee.value;
    console.log(`${this.agentId()} withdrawing ${value} WEI to wallet`);
    const controller = this.sdk.createWithdrawController(
      user.id,
      signer,
      { assetId: this.assetId, value },
      fee,
      this.fundsSourceAddress,
    );
    await controller.createProof();
    return controller.send();
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

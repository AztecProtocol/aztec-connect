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

export class UserData {
  constructor(
    public address: EthAddress,
    public signer: SchnorrSigner,
    public user: WalletSdkUser,
    public userAsset: WalletSdkUserAsset,
  ) {}
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
    const userAsset = user.getAsset(AssetId.ETH);
    const signer = user.getSigner();
    return new UserData(address, signer, user, userAsset);
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
    await this.sdk.depositFundsToContract(AssetId.ETH, this.primaryUser.address, deposit);
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
    const fee = this.depositFee ?? (await this.primaryUser.userAsset.getFee(TxType.DEPOSIT));
    console.log(`${this.agentId()} sending pending deposit with fee ${fee}...`);
    const pendingDeposit = await this.primaryUser.userAsset.pendingDeposit(this.primaryUser.address);
    const proof = await this.primaryUser.userAsset.createDepositProof(
      pendingDeposit - fee,
      fee,
      this.primaryUser.signer,
      this.primaryUser.address,
    );
    const signature = await this.sdk.signProof(proof, this.primaryUser.address);
    const hash = await this.sdk.sendProof(proof, signature);
    this.depositSent();
    return hash;
  };

  protected withdraw = async () => {
    console.log(`${this.agentId()} withdrawing...`);
    const fee = await this.primaryUser.userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
    const balance = this.primaryUser.userAsset.balance();
    console.log(`${this.agentId()} withdrawing ${balance} WEI to wallet`);
    const proof = await this.primaryUser.userAsset.createWithdrawProof(
      balance - fee,
      fee,
      this.primaryUser.signer,
      this.fundsSourceAddress,
    );
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

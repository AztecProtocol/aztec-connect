import {
  AztecSdk,
  AztecSdkUser,
  EthAddress,
  EthAsset,
  SchnorrSigner,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';

export class UserData {
  constructor(public address: EthAddress, public signer: SchnorrSigner, public user: AztecSdkUser) {}
}

export enum AgentState {
  RUNNING,
  AWAITING,
  COMPLETE,
}

export class Agent {
  private assetId = 0;
  private state = AgentState.RUNNING;

  constructor(
    private fundingAddress: EthAddress,
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private id: number,
  ) {}

  public async createUser() {
    const privateKey = randomBytes(32);
    const address = this.provider.addAccount(privateKey);
    const user = await this.sdk.addUser(privateKey, undefined, true);
    const signer = await this.sdk.createSchnorrSigner(privateKey);
    return new UserData(address, signer, user);
  }

  public async fundEthAddress(userData: UserData, deposit: bigint) {
    while (true) {
      try {
        console.log(`agent ${this.id} funding ${userData.address} with ${deposit} wei...`);
        const asset: EthAsset = new EthAsset(this.provider);
        const txHash = await asset.transfer(deposit, this.fundingAddress, userData.address);
        const receipt = await this.sdk.getTransactionReceipt(txHash);
        if (!receipt.status) {
          throw new Error('receipt status is false.');
        }
        break;
      } catch (err: any) {
        console.log(`agent ${this.id} failed to fund, will retry: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  public async deposit(userData: UserData, deposit: bigint, instant = false) {
    const { user, signer, address } = userData;
    const fee = (await this.sdk.getDepositFees(this.assetId))[
      instant ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
    ];
    console.log(`agent ${this.id} sending deposit with fee ${fee.value}...`);

    const controller = this.sdk.createDepositController(
      user.id,
      signer,
      { assetId: 0, value: deposit - fee.value },
      fee,
      address,
    );
    await controller.depositFundsToContract();
    await controller.awaitDepositFundsToContract();
    await controller.createProof();
    await controller.sign();
    await controller.send();
    return this.signalAwaiting(controller.awaitSettlement());
  }

  public async withdraw(userData: UserData) {
    const { user, signer } = userData;
    const fee = (await this.sdk.getWithdrawFees(this.assetId))[TxSettlementTime.NEXT_ROLLUP];
    const balance = await user.getBalance(this.assetId);
    const value = balance - fee.value;
    console.log(`agent ${this.id} withdrawing ${value} wei to ${userData.address.toString()}`);
    const controller = this.sdk.createWithdrawController(
      user.id,
      signer,
      { assetId: this.assetId, value },
      fee,
      userData.address,
    );
    await controller.createProof();
    await controller.send();
    return this.signalAwaiting(controller.awaitSettlement());
  }

  public async repayFundingAddress(userData: UserData) {
    const fee = toBaseUnits('420', 12);
    const value = (await this.sdk.getPublicBalance(this.assetId, userData.address)) - fee;

    console.log(`agent ${this.id} refunding ${this.fundingAddress} with ${value} wei...`);
    const asset: EthAsset = new EthAsset(this.provider);
    const txHash = await asset.transfer(value, userData.address, this.fundingAddress);
    return this.sdk.getTransactionReceipt(txHash);
  }

  public getState() {
    return this.state;
  }

  /**
   * Given a promise (one that is awaiting one of more tx settlements), wraps it such the the Agent is flagged
   * as AWAITING. This can be polled externally so that a higher level system can send a flushing transaction.
   */
  public async signalAwaiting(awaitSettlementPromise: Promise<void>) {
    this.state = AgentState.AWAITING;
    return awaitSettlementPromise.then(() => {
      this.state = AgentState.RUNNING;
    });
  }

  public complete() {
    this.state = AgentState.COMPLETE;
  }
}

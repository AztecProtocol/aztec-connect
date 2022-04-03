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

export interface EthAddressAndNonce {
  address: EthAddress;
  nonce: number;
}

export interface UserData {
  address: EthAddress;
  signer: SchnorrSigner;
  user: AztecSdkUser;
}

export class Agent {
  private assetId = 0;

  constructor(
    private fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private id: number,
  ) {}

  public async createUser(): Promise<UserData> {
    const privateKey = randomBytes(32);
    console.log(`agent ${this.id} private key: ${privateKey.toString('hex')}`);
    const address = this.provider.addAccount(privateKey);
    const user = await this.sdk.addUser(privateKey, undefined, true);
    const signer = await this.sdk.createSchnorrSigner(privateKey);
    return { address, signer, user };
  }

  public async fundEthAddress(userData: UserData, deposit: bigint) {
    console.log(`agent ${this.id} funding ${userData.address} with ${deposit} wei...`);
    const asset = new EthAsset(this.provider);
    // We increment the funding account nonce. This is shared amongst all agents, and ensures we correctly execute
    // L1 txs with sequential nonces, thus we can improve performance by calling this method concurrently.
    const txHash = await asset.transfer(deposit, this.fundingAccount.address, userData.address, {
      nonce: this.fundingAccount.nonce++,
    });
    await this.sdk.getTransactionReceipt(txHash);
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
    return controller.awaitSettlement();
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
    return controller.awaitSettlement();
  }

  public async repayFundingAddress(userData: UserData) {
    const fee = toBaseUnits('420', 12);
    const value = (await this.sdk.getPublicBalance(this.assetId, userData.address)) - fee;

    console.log(`agent ${this.id} refunding ${this.fundingAccount} with ${value} wei...`);
    const asset: EthAsset = new EthAsset(this.provider);
    const txHash = await asset.transfer(value, userData.address, this.fundingAccount.address);
    return this.sdk.getTransactionReceipt(txHash);
  }
}

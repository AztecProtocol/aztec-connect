import {
  AztecSdk,
  AztecSdkUser,
  DefiController,
  DepositController,
  EthAddress,
  EthAsset,
  SchnorrSigner,
  toBaseUnits,
  TransferController,
  TxSettlementTime,
  WalletProvider,
  WithdrawController,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { transferToken } from '@aztec/blockchain';

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

  private async fundAddressWithEth(userData: UserData, deposit: bigint) {
    console.log(
      `agent ${this.id} funding ${userData.address} with ${deposit} wei from address ${this.fundingAccount.address}...`,
    );
    const asset = new EthAsset(this.provider);
    // We increment the funding account nonce. This is shared amongst all agents, and ensures we correctly execute
    // L1 txs with sequential nonces, thus we can improve performance by calling this method concurrently.
    const txHash = await asset.transfer(deposit, this.fundingAccount.address, userData.address, {
      nonce: this.fundingAccount.nonce++,
    });
    const receipt = await this.sdk.getTransactionReceipt(txHash);
    if (!receipt.status) {
      throw new Error('receipt status is false.');
    }
  }

  public async transferAsset(from: EthAddress, to: EthAddress, deposit: bigint, assetId: number) {
    const assetInfo = this.sdk.getAssetInfo(assetId);
    console.log(`agent ${this.id} funding ${to} with ${deposit} ${assetInfo.name} from address ${from}...`);
    await transferToken(assetInfo.address, from, to, this.provider, deposit);
  }

  public async fundEthAddress(userData: UserData, deposit: bigint, assetId = 0) {
    if (assetId == 0) {
      await this.fundAddressWithEth(userData, deposit);
      return;
    }
    await this.transferAsset(this.fundingAccount.address, userData.address, deposit, assetId);
  }

  public async sendDeposit(userData: UserData, deposit: bigint, assetId = 0, instant = false) {
    const assetInfo = this.sdk.getAssetInfo(assetId);
    const { user, signer, address } = userData;
    const fee = (await this.sdk.getDepositFees(assetId))[
      instant ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
    ];
    console.log(
      `agent ${this.id} sending deposit of ${deposit} ${assetInfo.name} with fee ${fee.value}, address ${address}...`,
    );
    const actualDepositValue = assetId == 0 ? deposit - fee.value : deposit;

    const controller = this.sdk.createDepositController(
      user.id,
      signer,
      { assetId, value: actualDepositValue },
      fee,
      address,
    );
    await controller.createProof();
    await controller.sign();
    if (assetId != 0) {
      await controller.approve();
    }
    await controller.depositFundsToContract();
    await controller.awaitDepositFundsToContract();
    await controller.send();
    return controller;
  }

  public async awaitBulkSettlement(
    controllers: Array<DefiController | DepositController | WithdrawController | TransferController | undefined>,
  ) {
    const valid = controllers.filter(c => c != undefined);
    if (!valid.length) {
      return;
    }
    await Promise.all(controllers.map(c => c!.awaitSettlement()));
  }

  public async sendWithdraw(userData: UserData, assetId = 0) {
    const assetInfo = this.sdk.getAssetInfo(assetId);
    const { user, signer } = userData;
    const fee = (await this.sdk.getWithdrawFees(assetId))[TxSettlementTime.NEXT_ROLLUP];
    let assetBalance = await user.getBalance(assetId);
    const ethBalance = await user.getBalance(0);
    if (assetId == fee.assetId) {
      // asset is fee paying
      if (fee.value > assetBalance) {
        return;
      }
      // minus the fee from the withdrawal amount
      assetBalance -= fee.value;
    } else {
      // asset is not fee paying
      if (fee.value > ethBalance) {
        return;
      }
    }
    if (assetBalance == 0n) {
      return;
    }
    console.log(`agent ${this.id} withdrawing ${assetBalance} ${assetInfo.name} to ${userData.address.toString()}`);
    const controller = this.sdk.createWithdrawController(
      user.id,
      signer,
      { assetId, value: assetBalance },
      fee,
      userData.address,
    );
    await controller.createProof();
    await controller.send();
    return controller;
  }

  public async repayFundingAddress(userData: UserData) {
    const fee = toBaseUnits('420', 12);
    const value = (await this.sdk.getPublicBalance(0, userData.address)) - fee;
    if (value <= 0) {
      return;
    }

    console.log(`agent ${this.id} refunding ${this.fundingAccount.address} with ${value} wei...`);
    const asset: EthAsset = new EthAsset(this.provider);
    const txHash = await asset.transfer(value, userData.address, this.fundingAccount.address);
    return this.sdk.getTransactionReceipt(txHash);
  }
}

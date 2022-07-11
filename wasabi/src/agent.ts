import { transferToken } from '@aztec/blockchain';
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
  ProofId,
  UserPaymentTx,
  AssetValue,
  DefiSettlementTime,
  FeePayer,
} from '@aztec/sdk';
import { randomBytes } from 'crypto';

type AnyController = DefiController | DepositController | WithdrawController | TransferController;

export interface EthAddressAndNonce {
  address: EthAddress;
  nonce: number;
}

export interface UserData {
  address: EthAddress;
  signer: SchnorrSigner;
  user: AztecSdkUser;
  userRegistered: boolean;
}

export interface AgentFees {
  depositFee: AssetValue;
  transferFee: AssetValue;
  withdrawFee: AssetValue;
}

export class Agent {
  constructor(
    private fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    private provider: WalletProvider,
    private id: number,
  ) {}

  public async createUser(usersPrivateKey?: Buffer): Promise<UserData> {
    const privateKey = usersPrivateKey ?? randomBytes(32);
    const address = this.provider.addAccount(privateKey);
    const signer = await this.sdk.createSchnorrSigner(privateKey);
    const publicKey = await this.sdk.derivePublicKey(privateKey);
    const userExists = await this.sdk.userExists(publicKey);
    const user = !userExists ? await this.sdk.addUser(privateKey, false) : await this.sdk.getUser(publicKey);
    await user.awaitSynchronised();
    return { address, signer, user, userRegistered: false };
  }

  private async fundAddressWithEth(userData: UserData, deposit: bigint) {
    const asset = new EthAsset(this.provider);
    const currentBalance = await asset.balanceOf(userData.address);
    console.log(
      `agent ${this.id} funding ${userData.address} with ${this.getBalanceString(deposit)} from address ${
        this.fundingAccount.address
      }, current balance: ${currentBalance}...`,
    );
    const requiredDeposit = deposit - currentBalance;
    if (requiredDeposit <= 0) {
      console.log(
        `ETH address ${userData.address.toString()} already has sufficient balance: ${this.getBalanceString(
          currentBalance,
        )}`,
      );
      return;
    }
    console.log(
      `topping up ETH address ${userData.address.toString()} with additional funds: ${this.getBalanceString(
        requiredDeposit,
      )}`,
    );
    // We increment the funding account nonce. This is shared amongst all agents, and ensures we correctly execute
    // L1 txs with sequential nonces, thus we can improve performance by calling this method concurrently.
    const txHash = await asset.transfer(requiredDeposit, this.fundingAccount.address, userData.address, {
      nonce: this.fundingAccount.nonce++,
    });
    const receipt = await this.sdk.getTransactionReceipt(txHash);
    if (!receipt.status) {
      throw new Error('receipt status is false.');
    }
  }

  public async transferAsset(from: EthAddress, to: EthAddress, deposit: bigint, assetId: number) {
    const assetInfo = this.sdk.getAssetInfo(assetId);
    console.log(
      `agent ${this.id} funding ${to} with ${this.getBalanceString(deposit, assetId)} from address ${from}...`,
    );
    await transferToken(assetInfo.address, from, to, this.provider, deposit);
  }

  public async fundEthAddress(userData: UserData, deposit: bigint, assetId = 0) {
    if (assetId == 0) {
      await this.fundAddressWithEth(userData, deposit);
      return;
    }
    await this.transferAsset(this.fundingAccount.address, userData.address, deposit, assetId);
  }

  public async calculateFundsAlreadyInAztec(user: UserData, assetId = 0, includePending = false) {
    const sumOfPendingDeposits = await this.sumPendingDeposits(user);
    const spendableBalance = await user.user.getMaxSpendableValue(assetId, false, !includePending, 2);
    const funds = sumOfPendingDeposits + spendableBalance;
    return funds;
  }

  public filterForPendingShields(txs: UserPaymentTx[]): UserPaymentTx[] {
    return txs.filter((tx): tx is UserPaymentTx => tx.proofId === ProofId.DEPOSIT && !tx.settled);
  }

  public sumPendingShields(txs: UserPaymentTx[], assetId: number) {
    let total = 0n;
    for (const tx of txs) {
      if (tx.value.assetId === assetId) {
        total += tx.value.value;
      }
    }
    return total;
  }

  public async sumPendingDeposits(user: UserData) {
    const userPaymentTxs = await user.user.getPaymentTxs();
    const userPendingDeposits = this.filterForPendingShields(userPaymentTxs);
    return this.sumPendingShields(userPendingDeposits, 0);
  }

  public async awaitPendingDeposits(user: UserData) {
    const txs = await user.user.getTxs();
    const ethDepositIds = txs
      .filter(tx => tx.proofId == ProofId.DEPOSIT && tx.settled === undefined)
      .map(tx => tx.txId)
      .filter(id => id !== undefined);
    if (!ethDepositIds.length) {
      return;
    }
    console.log(`found ${ethDepositIds.length} unsettled deposits for user ${user.user.id}`);
    // wait for all existing deposits to settle
    await Promise.all(ethDepositIds.map(id => this.sdk.awaitSettlement(id!)));
  }

  public async sendDeposit(
    fundingAddress: EthAddress,
    userData: UserData,
    deposit: bigint,
    assetId = 0,
    instant = false,
    maxFee?: bigint,
    feePayer?: FeePayer,
  ) {
    const { user, address, userRegistered } = userData;
    const fee = await this.waitForMaxFee(
      () => this.sdk.getDepositFees(assetId),
      instant ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP,
      maxFee,
    );
    const actualDepositValue = assetId == 0 ? deposit - fee.value : deposit;
    console.log(
      `agent ${this.id} sending deposit of ${this.getBalanceString(actualDepositValue, assetId)} with fee ${
        fee.value
      }, address ${address}...`,
    );

    const controller = await this.executeUntilSucces(async () => {
      const controller = this.sdk.createDepositController(
        fundingAddress,
        { assetId, value: actualDepositValue },
        fee,
        user.id,
        userRegistered,
        feePayer,
      );
      await controller.createProof();
      await controller.sign();
      if (assetId != 0) {
        await controller.approve();
      }
      const requiredFunds = await controller.getRequiredFunds();
      if (requiredFunds) {
        await controller.depositFundsToContract();
        await controller.awaitDepositFundsToContract();
      }
      await controller.send();
      return controller;
    }, `deposit for agent ${this.id}`);
    console.log(
      `agent ${this.id} sent deposit of ${this.getBalanceString(actualDepositValue, assetId)} with fee ${
        fee.value
      }, address ${address}...`,
    );
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

  public async sendWithdraw(
    userData: UserData,
    withdrawAddress: EthAddress = userData.address,
    assetId = 0,
    maxFee?: bigint,
  ) {
    const { user, signer } = userData;
    const fee = await this.waitForMaxFee(
      () => this.sdk.getWithdrawFees(assetId, userData.address),
      TxSettlementTime.NEXT_ROLLUP,
      maxFee,
    );
    let assetBalance = await userData.user.getMaxSpendableValue(assetId, false, false, 2);
    const ethBalance = await userData.user.getMaxSpendableValue(0, false, false, 2);
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
    console.log(
      `agent ${this.id} withdrawing ${this.getBalanceString(assetBalance, assetId)} to ${withdrawAddress.toString()}`,
    );
    return await this.executeUntilSucces(async () => {
      const controller = this.sdk.createWithdrawController(
        user.id,
        signer,
        { assetId, value: assetBalance },
        fee,
        withdrawAddress,
      );
      await controller.createProof();
      await controller.send();
      return controller;
    }, `withdraw for agent ${this.id}`);
  }

  public async transfer(sender: UserData, recipient: UserData, assetValue: AssetValue, maxFee?: bigint) {
    console.log(`agent ${this.id} transferring ${this.sdk.fromBaseUnits(assetValue, true)}...`);
    const fee = await this.waitForMaxFee(
      () => this.sdk.getTransferFees(assetValue.assetId),
      TxSettlementTime.NEXT_ROLLUP,
      maxFee,
    );
    console.log(
      `agent ${this.id} transferring ${this.sdk.fromBaseUnits(assetValue, true)} with fee ${this.sdk.fromBaseUnits(
        fee,
        true,
      )}...`,
    );
    return await this.executeUntilSucces(async () => {
      const controller = this.sdk.createTransferController(
        sender.user.id,
        sender.signer,
        assetValue,
        fee,
        recipient.user.id,
      );
      await controller.createProof();
      await controller.send();
      return controller;
    }, `transfer for agent ${this.id}`);
  }

  public async repayFundingAddress(userData: UserData) {
    const fee = toBaseUnits('420', 12);
    const value = (await this.sdk.getPublicBalance(userData.address, 0)).value - fee;
    if (value <= 0) {
      return;
    }

    console.log(`agent ${this.id} refunding ${this.fundingAccount.address} with ${this.getBalanceString(value)}...`);
    const asset: EthAsset = new EthAsset(this.provider);
    const txHash = await asset.transfer(value, userData.address, this.fundingAccount.address);
    return this.sdk.getTransactionReceipt(txHash);
  }

  public getBalanceString(amount: bigint, assetId = 0) {
    return `${this.sdk.fromBaseUnits({ assetId, value: amount }, true)}`;
  }

  public async waitForMaxFee(
    operation: () => Promise<AssetValue[]>,
    settlement: TxSettlementTime | DefiSettlementTime,
    maxFee?: bigint,
  ) {
    while (true) {
      const fees = await operation();
      if (!maxFee || fees[settlement].value <= maxFee) {
        return fees[settlement];
      }
      await this.sleep();
    }
  }

  public async sleep(timeMs = 30000) {
    await new Promise(resolve => setTimeout(resolve, timeMs));
  }

  public async executeUntilSucces(operation: () => Promise<AnyController>, method: string) {
    while (true) {
      try {
        return await operation();
      } catch (err) {
        console.log(`method ${method} failed, will retry...`, err);
      }
      await this.sleep();
    }
  }
}

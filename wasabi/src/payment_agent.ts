import { AztecSdk, toBaseUnits, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent';

/**
 * This agent will repeatedly send 1 wei from userA to userB in batches of 10, waiting for those 10 to settle,
 * until a total of numTransfers have taken place.
 */
export class PaymentAgent {
  private agent: Agent;
  private userA!: UserData;
  private userB!: UserData;

  constructor(
    fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
    private numConcurrentTransfers: number,
    private assetId: number = 0,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  /**
   * We need enough ETH to deposit funds to the contract, plus calcDeposit().
   * Could do a better estimate of the cost of depositPendingFundsToContact().
   */
  public static getRequiredFunding() {
    return toBaseUnits('0.01', 18);
  }

  public async run() {
    try {
      this.userA = await this.agent.createUser();
      this.userB = await this.agent.createUser();

      await this.agent.fundEthAddress(this.userA, PaymentAgent.getRequiredFunding());
      await (await this.agent.sendDeposit(this.userA, await this.calcDeposit()))?.awaitSettlement();

      if (this.assetId != 0) {
        await this.agent.fundEthAddress(this.userA, BigInt(this.numTransfers), this.assetId);
        await (await this.agent.sendDeposit(this.userA, BigInt(this.numTransfers), this.assetId))?.awaitSettlement();
      }

      for (let i = 0; i < this.numTransfers; ) {
        const transferPromises: Promise<void>[] = [];
        while (transferPromises.length < Math.min(this.numTransfers, this.numConcurrentTransfers)) {
          try {
            const txId = await this.transfer(this.userA, this.userB, this.assetId, 1n);
            const j = i;
            const p = this.sdk.awaitSettlement(txId).then(() => console.log(`agent ${this.id} transfer ${j} settled.`));
            transferPromises.push(p);
            ++i;
          } catch (err) {
            console.log(`${this.id} ERROR sending payment: `, err);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        await Promise.all(transferPromises);
      }

      if (this.assetId != 0) {
        await (await this.agent.sendWithdraw(this.userB, this.assetId))?.awaitSettlement();
      }
      await (await this.agent.sendWithdraw(this.userB))?.awaitSettlement();
      await (await this.agent.sendWithdraw(this.userA))?.awaitSettlement();
      await this.agent.repayFundingAddress(this.userA);

      await this.sdk.removeUser(this.userA.user.id);
      await this.sdk.removeUser(this.userB.user.id);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  /**
   * We transfer 1 wei numTransfers times. Calculate deposit large enough for all fees and transfers.
   */
  private async calcDeposit() {
    const assetDepositFee = (await this.sdk.getDepositFees(this.assetId))[TxSettlementTime.NEXT_ROLLUP];
    const assetWithdrawFee = (await this.sdk.getWithdrawFees(this.assetId))[TxSettlementTime.NEXT_ROLLUP];
    const transferFee = (await this.sdk.getTransferFees(this.assetId))[TxSettlementTime.NEXT_ROLLUP];
    const ethDepositFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP];
    const ethWithdrawFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP];
    const transfers = BigInt(this.numTransfers);
    const ethFees = ethDepositFee.value + ethWithdrawFee.value + transferFee.value * transfers;
    return this.assetId == 0 ? ethFees : ethFees + assetDepositFee.value + assetWithdrawFee.value;
  }

  private async transfer(sender: UserData, recipient: UserData, assetId = 0, value = 1n) {
    const assetInfo = this.sdk.getAssetInfo(assetId);
    console.log(`agent ${this.id} transferring ${value} ${assetInfo.name} from userA to userB...`);
    const [fee] = await this.sdk.getTransferFees(assetId);
    const controller = this.sdk.createTransferController(
      sender.user.id,
      sender.signer,
      { assetId: assetId, value },
      fee,
      recipient.user.id,
    );
    await controller.createProof();
    return await controller.send();
  }
}

import { AztecSdk, toBaseUnits, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent';

/**
 * This agent will repeatedly send 1 wei from userA to userB in batches of 10, waiting for those 10 to settle,
 * until a total of numTransfers have taken place.
 */
export class PaymentAgent {
  private readonly numConcurrentTransfers = 10;
  private agent: Agent;
  private userA!: UserData;
  private userB!: UserData;

  constructor(
    fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  public static getRequiredFunding() {
    return toBaseUnits('0.01', 18);
  }

  /**
   * Return an address to fund with the amount in getRequiredFunding().
   */
  public async init() {
    return this.userA.address;
  }

  public async run() {
    try {
      this.userA = await this.agent.createUser();
      this.userB = await this.agent.createUser();

      await this.agent.fundEthAddress(this.userA, PaymentAgent.getRequiredFunding());

      await this.agent.deposit(this.userA, await this.calcDeposit());

      for (let i = 0; i < this.numTransfers; ) {
        const transferPromises: Promise<void>[] = [];
        while (transferPromises.length < Math.min(this.numTransfers, this.numConcurrentTransfers)) {
          try {
            const txId = await this.transfer(this.userA, this.userB, 1n);
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

      await this.agent.withdraw(this.userA);
      await this.agent.repayFundingAddress(this.userA);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  /**
   * We transfer 1 wei numTransfers times. Calculate deposit large enough for all fees and transfers.
   */
  private async calcDeposit() {
    const transferFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP];
    const withdrawFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP];
    const transfers = BigInt(this.numTransfers);
    return withdrawFee.value + transfers * transferFee.value + transfers;
  }

  private async transfer(sender: UserData, recipient: UserData, value = 1n) {
    console.log(`agent ${this.id} transferring ${value} wei from userA to userB...`);
    const [fee] = await this.sdk.getTransferFees(0);
    const controller = this.sdk.createTransferController(
      sender.user.id,
      sender.signer,
      { assetId: 0, value },
      fee,
      recipient.user.id,
    );
    await controller.createProof();
    return await controller.send();
  }
}

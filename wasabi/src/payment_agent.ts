import { AssetValue, AztecSdk, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, AgentFees, EthAddressAndNonce, UserData } from './agent';

/**
 * This agent will repeatedly send 1 wei from userA to itself in batches, waiting for the batch to settle,
 * until a total of numTransfers have taken place.
 */
export class PaymentAgent {
  private agent: Agent;
  private userA!: UserData;
  private agentFees!: AgentFees;

  constructor(
    private fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
    private numConcurrentTransfers: number,
    private userPrivateKey?: Buffer,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  public static async create(
    fundingAccount: EthAddressAndNonce,
    sdk: AztecSdk,
    provider: WalletProvider,
    id: number,
    numTransfers: number,
    numConcurrentTransfers: number,
    userPrivateKey?: Buffer,
  ) {
    const agent = new PaymentAgent(
      fundingAccount,
      sdk,
      provider,
      id,
      numTransfers,
      numConcurrentTransfers,
      userPrivateKey,
    );
    await agent.init();
    return agent;
  }

  // this calculates the amont that we need to be deposited to contract in order to run the test
  public async getFundingRequirement() {
    const fees = await this.getFees();
    const amountRequiredInAztec = await this.getAmountRequiredWithinAztec();
    const amountAlreadyInAztec = await this.agent.calculateFundsAlreadyInAztec(this.userA, 0, false);
    const newDepositRequirement = amountRequiredInAztec - amountAlreadyInAztec;
    const fundingRequirement = { assetId: 0, value: 0n } as AssetValue;
    if (newDepositRequirement > 0) {
      fundingRequirement.value = newDepositRequirement + fees.depositFee.value;
    }
    return [fundingRequirement];
  }

  // calculate the amount required 'within' aztec
  // basically the sum of transfer and withdraw fees plus 1 wei for each transfer
  private async getAmountRequiredWithinAztec() {
    const fees = await this.getFees();
    const requiredFunding =
      fees.transferFee.value * BigInt(this.numTransfers) + fees.withdrawFee.value + BigInt(this.numTransfers + 1);
    return requiredFunding;
  }

  private async getFees() {
    if (!this.agentFees) {
      const fees: AgentFees = {
        depositFee: (await this.sdk.getDepositFees(0))[TxSettlementTime.NEXT_ROLLUP],
        transferFee: (await this.sdk.getTransferFees(0))[TxSettlementTime.NEXT_ROLLUP],
        withdrawFee: (await this.sdk.getWithdrawFees(0, this.userA.address))[TxSettlementTime.NEXT_ROLLUP],
      };
      this.agentFees = fees;
    }
    return this.agentFees;
  }

  public async init() {
    this.userA = await this.agent.createUser(this.userPrivateKey);
  }

  public async run() {
    try {
      await this.agent.awaitPendingDeposits(this.userA);

      const amountToBeDeposited = (await this.getFundingRequirement())[0];
      // if > 0 then the deposit fee is included
      if (amountToBeDeposited.value > 0) {
        console.log(`agent ${this.id} requires additional deposit of ${amountToBeDeposited.value} including fee..`);
        const depositControlller = await this.agent.sendDeposit(
          this.fundingAccount.address,
          this.userA,
          amountToBeDeposited.value,
          0,
          false,
        );
        await depositControlller.awaitSettlement();
      } else {
        console.log(`agent ${this.id} does not require additional deposit`);
      }
      const transferPromises: Promise<void>[] = [];
      let transfersRemaining = this.numTransfers;
      let transferCount = 0;
      while (transfersRemaining) {
        while (transferPromises.length < Math.min(transfersRemaining, this.numConcurrentTransfers)) {
          try {
            const controller = await this.agent.transfer(
              this.userA,
              this.userA,
              { assetId: 0, value: 1n },
              this.agentFees.transferFee.value,
            );
            const j = transferCount++;
            const p = controller.awaitSettlement().then(() => console.log(`agent ${this.id} transfer ${j} settled.`));
            transferPromises.push(p);
          } catch (err) {
            console.log(`agent ${this.id} ERROR sending payment: `, err);
            await this.agent.sleep(10000);
          }
        }
        await Promise.all(transferPromises);
        transfersRemaining -= transferPromises.length;
        transferPromises.splice(0, transferPromises.length);
      }

      // withdrawals will only be requested if there are enough funds to do so
      await (await this.agent.sendWithdraw(this.userA, this.fundingAccount.address))?.awaitSettlement();

      await this.sdk.removeUser(this.userA.user.id);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }
}

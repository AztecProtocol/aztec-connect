import { AztecSdk, EthAddress, toBaseUnits, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, AgentState, UserData } from './agent';

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
    fundingAddress: EthAddress,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
  ) {
    this.agent = new Agent(fundingAddress, sdk, provider, id);
  }

  public isAwaitingSettlement() {
    return this.agent.getState() === AgentState.AWAITING;
  }

  public isComplete() {
    return this.agent.getState() === AgentState.COMPLETE;
  }

  /**
   * Create userA and userB, and funds userA with ETH from the fundingAddress.
   * This should be called sequentially by the AgentManager, to ensure each L1 tx has a sequential nonce.
   * Once userA has their own funds we no longer need to worry about nonce races within the run() context.
   */
  public async init() {
    this.userA = await this.agent.createUser();
    this.userB = await this.agent.createUser();

    const deposit = toBaseUnits('0.01', 18);
    return this.agent.fundEthAddress(this.userA, deposit);
  }

  public async run() {
    try {
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
        await this.agent.signalAwaiting(Promise.all(transferPromises).then());
      }

      await this.agent.withdraw(this.userA);
      await this.agent.repayFundingAddress(this.userA);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
    this.agent.complete();
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

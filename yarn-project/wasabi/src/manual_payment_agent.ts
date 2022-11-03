import { AztecSdk, TxId, WalletProvider, TxSettlementTime } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent.js';

/**
 * This agent will send 1 wei from userA to userB on command a total of maxTransfers times
 * The limit is required so the agent know how much to deposit into Aztec
 */
export class ManualPaymentAgent {
  private agent: Agent;
  private userA!: UserData;
  private txIDs: TxId[] = [];

  constructor(
    private fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private maxTransfers: number,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  public static async create(
    fundingAccount: EthAddressAndNonce,
    sdk: AztecSdk,
    provider: WalletProvider,
    id: number,
    maxTransfers: number,
  ) {
    const agent = new ManualPaymentAgent(fundingAccount, sdk, provider, id, maxTransfers);
    await agent.init();
    return agent;
  }
  public async init() {
    this.userA = await this.agent.createUser();
  }

  public async getFundingRequirement() {
    const fundsAvailable = await this.agent.calculateFundsAlreadyInAztec(this.userA, 0, true);
    const requiredDeposit = await this.calcDeposit();
    const depositFee = (await this.sdk.getDepositFees(0))[TxSettlementTime.INSTANT];
    const fundingRequirement = requiredDeposit - fundsAvailable;
    return fundingRequirement > 0n ? fundingRequirement + depositFee.value : 0n;
  }

  public async start() {
    const requiredDeposit = await this.getFundingRequirement();
    if (requiredDeposit <= 0n) {
      return;
    }
    await (
      await this.agent.sendDeposit(this.fundingAccount.address, this.userA, requiredDeposit, 0, true)
    )?.awaitSettlement();
  }

  public async run() {
    const transferPromises = this.txIDs.map(x => this.sdk.awaitSettlement(x));
    await Promise.all(transferPromises);
  }

  /**
   * We transfer 1 wei up to maxTransfers times. Calculate deposit large enough for all fees and transfers.
   */
  private async calcDeposit() {
    const transferFee = (await this.sdk.getTransferFees(0))[TxSettlementTime.INSTANT];
    const transfers = BigInt(this.maxTransfers);
    return transferFee.value * transfers + transfers;
  }

  public async transfer() {
    const assetInfo = this.sdk.getAssetInfo(0);
    const value = 1n;
    const sender = this.userA;
    const recipient = this.userA;
    console.log(`agent ${this.id} transferring ${value} ${assetInfo.name}...`);
    const fee = (await this.sdk.getTransferFees(0))[TxSettlementTime.INSTANT];
    const controller = this.sdk.createTransferController(
      sender.user.id,
      sender.signer,
      { assetId: 0, value },
      fee,
      recipient.user.id,
      true,
    );
    await controller.createProof();
    this.txIDs.push(await controller.send());
    return this.txIDs[this.txIDs.length - 1];
  }
}

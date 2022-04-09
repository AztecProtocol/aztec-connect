import { AztecSdk, toBaseUnits, TxId, WalletProvider, TxSettlementTime } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent';

/**
 * This agent will send 1 wei from userA to userB on command a total of maxTransfers times
 * The limit is required so the agent know how much to deposit into Aztec
 */
export class ManualPaymentAgent {
  private agent: Agent;
  private userA!: UserData;
  private userB!: UserData;
  private txIDs: TxId[] = [];

  constructor(
    fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private maxTransfers: number,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  public static getRequiredFunding() {
    return toBaseUnits('0.01', 18);
  }

  /**
   * Create userA and userB, and funds userA with ETH from the fundingAddress.
   * This should be called sequentially by the AgentManager, to ensure each L1 tx has a sequential nonce.
   * Once userA has their own funds we no longer need to worry about nonce races within the run() context.
   */
  public async init() {
    this.userA = await this.agent.createUser();
    this.userB = await this.agent.createUser();
    await this.agent.fundEthAddress(this.userA, ManualPaymentAgent.getRequiredFunding());
    await (await this.agent.sendDeposit(this.userA, await this.calcDeposit()))?.awaitSettlement();
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
    const ethDepositFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.INSTANT];
    const ethWithdrawFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.INSTANT];
    const transfers = BigInt(this.maxTransfers);
    return ethDepositFee.value + ethWithdrawFee.value + transferFee.value * transfers;
  }

  public async transfer() {
    const assetInfo = this.sdk.getAssetInfo(0);
    const value = 1n;
    const sender = this.userA;
    const recipient = this.userB;
    console.log(`agent ${this.id} transferring ${value} ${assetInfo.name} from userA to userB...`);
    const fee = (await this.sdk.getTransferFees(0))[TxSettlementTime.INSTANT];
    const controller = this.sdk.createTransferController(
      sender.user.id,
      sender.signer,
      { assetId: 0, value },
      fee,
      recipient.user.id,
    );
    await controller.createProof();
    this.txIDs.push(await controller.send());
    return this.txIDs[this.txIDs.length - 1];
  }
}

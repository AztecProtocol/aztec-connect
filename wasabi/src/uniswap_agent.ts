import { AztecSdk, DefiSettlementTime, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent';
import { bridgeConfigs, BridgeSpec, getBridgeId } from './bridges';

const DAI_TO_ETH_RATE = 1000n;
const SAFE_DAI_TO_ETH_RATE = (9n * DAI_TO_ETH_RATE) / 10n;

export class UniswapAgent {
  private agent: Agent;
  private user!: UserData;

  constructor(
    fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  /**
   * We need enough ETH to deposit funds to the contract, plus calcDeposit().
   * depositPendingFundsToContact() requires ~50,000 gas. Assume 4 gwei gas price.
   */
  public static async getRequiredFunding(sdk: AztecSdk, numTransfers: number) {
    return 50000n * 4n * 10n ** 9n + (await UniswapAgent.calcDeposit(sdk, numTransfers));
  }

  public async run() {
    try {
      this.user = await this.agent.createUser();
      const requiredFunding = await UniswapAgent.getRequiredFunding(this.sdk, this.numTransfers);
      await this.agent.fundEthAddress(this.user, requiredFunding);
      const deposit = await UniswapAgent.calcDeposit(this.sdk, this.numTransfers);
      const controller = await this.agent.sendDeposit(this.user!, deposit);
      await controller.awaitSettlement();
      for (let i = 0; i < this.numTransfers; i++) {
        // we need to swap and amount of wei, plus the fee for the return swap
        const weiValueToSwap = 1000000n + (await this.getDefiFee(bridgeConfigs[1])).value / SAFE_DAI_TO_ETH_RATE;
        const ethToDaiController = await this.singleDefiSwap(bridgeConfigs[0], weiValueToSwap);
        await ethToDaiController?.awaitSettlement();
        const daiToEthController = await this.singleDefiSwap(bridgeConfigs[1]);
        await daiToEthController?.awaitSettlement();
      }
      await (await this.agent.sendWithdraw(this.user))?.awaitSettlement();
      await this.agent.repayFundingAddress(this.user);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  private async getDefiFee(bridgeSpec: BridgeSpec, settlementTime: DefiSettlementTime = DefiSettlementTime.DEADLINE) {
    return (await this.sdk.getDefiFees(getBridgeId(bridgeSpec)))[settlementTime];
  }

  private async getBalance(assetId = 0) {
    return await this.sdk.getBalance(this.user!.user.id, assetId);
  }

  private static async calcDeposit(sdk: AztecSdk, numTransfers: number) {
    const getDefiFee = async (bridgeSpec: BridgeSpec) =>
      (await sdk.getDefiFees(getBridgeId(bridgeSpec)))[DefiSettlementTime.DEADLINE];
    const ethToDaiFee = await getDefiFee(bridgeConfigs[0]);
    const daiToEthFee = await getDefiFee(bridgeConfigs[1]);
    const startingWeiQuantity = 1000000n;
    const depositFee = (await sdk.getDepositFees(0))[TxSettlementTime.NEXT_ROLLUP].value;
    const withdrawFee = (await sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP].value;
    return (
      BigInt(numTransfers) * (ethToDaiFee.value + daiToEthFee.value / SAFE_DAI_TO_ETH_RATE) +
      depositFee +
      withdrawFee +
      startingWeiQuantity
    );
  }

  private singleDefiSwap = async (spec: BridgeSpec, amountToTransfer = 0n) => {
    const bridgeId = getBridgeId(spec);
    const fee = await this.getDefiFee(spec);
    if (amountToTransfer == 0n) {
      // the provided amount is zero, transfer everything we have after the fee is paid
      amountToTransfer = (await this.getBalance(spec.inputAsset)).value - fee.value;
    }
    const inputAssetInfo = this.sdk.getAssetInfo(spec.inputAsset);
    const outputAssetInfo = this.sdk.getAssetInfo(spec.outputAsset);
    console.log(
      `agent ${this.id} swapping ${amountToTransfer} of asset ${inputAssetInfo.name} for ${outputAssetInfo.name} with fee ${fee.value}`,
    );
    const controller = this.sdk.createDefiController(
      this.user!.user.id,
      this.user!.signer,
      bridgeId,
      { assetId: spec.inputAsset, value: amountToTransfer },
      fee,
    );
    await controller.createProof();
    await controller.send();
    return controller;
  };
}

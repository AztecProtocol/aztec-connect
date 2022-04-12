import { AztecSdk, DefiSettlementTime, toBaseUnits, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, EthAddressAndNonce, UserData } from './agent';
import { getBridgeId, bridgeConfigs, BridgeSpec } from './bridges';

const DAI_TO_ETH_RATE = 1000n;
const SAFE_DAI_TO_ETH_RATE = (9n * DAI_TO_ETH_RATE) / 10n;

export class UniswapAgent {
  private agent: Agent;
  private user?: UserData;

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
    return toBaseUnits('0.1', 18);
  }

  public async run() {
    try {
      this.user = await this.agent.createUser();
      const requiredFunding = UniswapAgent.getRequiredFunding();
      await this.agent.fundEthAddress(this.user, requiredFunding);
      const deposit = await this.calcDeposit();
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
      await (await this.agent.sendWithdraw(this.user!))?.awaitSettlement();
      await this.agent.repayFundingAddress(this.user!);
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  private async getDefiFee(bridgeSpec: BridgeSpec, settlementTime: DefiSettlementTime = DefiSettlementTime.DEADLINE) {
    return (await this.sdk.getDefiFees(getBridgeId(bridgeSpec)))[settlementTime];
  }

  private async getBalance(assetId = 0) {
    return await this.sdk.getBalanceAv(assetId, this.user!.user.id);
  }

  private async calcDeposit() {
    const ethToDaiFee = await this.getDefiFee(bridgeConfigs[0]);
    const daiToEthFee = await this.getDefiFee(bridgeConfigs[1]);
    const startingWeiQuantity = 1000000n;
    const depositFee = (await this.sdk.getDepositFees(0))[TxSettlementTime.NEXT_ROLLUP].value;
    const withdrawFee = (await this.sdk.getWithdrawFees(0))[TxSettlementTime.NEXT_ROLLUP].value;
    return (
      BigInt(this.numTransfers) * (ethToDaiFee.value + daiToEthFee.value / SAFE_DAI_TO_ETH_RATE) +
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

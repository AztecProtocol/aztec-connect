import { AssetValue, AztecSdk, DefiSettlementTime, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { Agent, AgentFees, EthAddressAndNonce, UserData } from './agent';
import { bridgeConfigs, BridgeSpec, getBridgeId } from './bridges';

// we need to swap 2 wei as the exchange rate means any less and the return transfer would fail
const WEI_VALUE_TO_SWAP = 2n;

interface DefiAgentFees {
  agentFees: AgentFees;
  ethToDaiFee: AssetValue;
  daiToEthFee: AssetValue;
}

export class UniswapAgent {
  private agent: Agent;
  private user!: UserData;
  private agentFees!: DefiAgentFees;

  constructor(
    private fundingAccount: EthAddressAndNonce,
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private numTransfers: number,
    private privateKeyForSendngUser?: Buffer,
  ) {
    this.agent = new Agent(fundingAccount, sdk, provider, id);
  }

  public async init() {
    this.user = await this.agent.createUser(this.privateKeyForSendngUser);
  }

  public static async create(
    fundingAccount: EthAddressAndNonce,
    sdk: AztecSdk,
    provider: WalletProvider,
    id: number,
    numTransfers: number,
    privateKeyForSendngUser?: Buffer,
  ) {
    const agent = new UniswapAgent(fundingAccount, sdk, provider, id, numTransfers, privateKeyForSendngUser);
    await agent.init();
    return agent;
  }

  // this calculates the amont that we need to be deposited to contract in order to run the test
  public async getFundingRequirement() {
    const fees = await this.getFees();
    const amountRequiredInAztec = await this.getAmountRequiredWithinAztec();
    const amountAlreadyInAztec = await this.agent.calculateFundsAlreadyInAztec(this.user, 0, false);
    const newDepositRequirement = amountRequiredInAztec - amountAlreadyInAztec;
    const fundingRequirement = { assetId: 0, value: 0n } as AssetValue;
    if (newDepositRequirement > 0) {
      fundingRequirement.value = newDepositRequirement + fees.agentFees.depositFee.value;
    }
    return [fundingRequirement];
  }

  private async getAmountRequiredWithinAztec() {
    const fees = await this.getFees();
    const withdrawFee = fees.agentFees.withdrawFee.value;
    return (
      BigInt(this.numTransfers) * (WEI_VALUE_TO_SWAP + fees.ethToDaiFee.value + fees.daiToEthFee.value) +
      withdrawFee +
      1n
    );
  }

  private async getFees() {
    if (!this.agentFees) {
      const getDefiFee = async (bridgeSpec: BridgeSpec) =>
        (await this.getDefiFees(bridgeSpec))[DefiSettlementTime.DEADLINE];
      const ethToDaiFee = await getDefiFee(bridgeConfigs[0]);
      const daiToEthFee = await getDefiFee(bridgeConfigs[1]);
      const fees: AgentFees = {
        depositFee: (await this.sdk.getDepositFees(0))[TxSettlementTime.NEXT_ROLLUP],
        transferFee: (await this.sdk.getTransferFees(0))[TxSettlementTime.NEXT_ROLLUP],
        withdrawFee: (await this.sdk.getWithdrawFees(0, this.user.address))[TxSettlementTime.NEXT_ROLLUP],
      };
      this.agentFees = {
        agentFees: fees,
        ethToDaiFee,
        daiToEthFee,
      };
    }
    return this.agentFees;
  }

  public async run() {
    try {
      const fees = await this.getFees();
      await this.agent.awaitPendingDeposits(this.user);

      const amountToBeDeposited = (await this.getFundingRequirement())[0];
      // if > 0 then the deposit fee is included
      if (amountToBeDeposited.value > 0) {
        console.log(`agent ${this.id} requires additional deposit of ${amountToBeDeposited.value} including fee..`);
        const depositControlller = await this.agent.sendDeposit(
          this.fundingAccount.address,
          this.user,
          amountToBeDeposited.value,
          0,
          false,
        );
        await depositControlller.awaitSettlement();
      } else {
        console.log(`agent ${this.id} does not require additional deposit`);
      }

      for (let i = 0; i < this.numTransfers; i++) {
        const ethToDaiController = await this.singleDefiSwap(
          bridgeConfigs[0],
          fees.ethToDaiFee.value,
          WEI_VALUE_TO_SWAP,
        );
        await ethToDaiController?.awaitSettlement();
        const daiToEthController = await this.singleDefiSwap(bridgeConfigs[1], fees.daiToEthFee.value);
        await daiToEthController?.awaitSettlement();
      }
      await (await this.agent.sendWithdraw(this.user, this.fundingAccount.address))?.awaitSettlement();
    } catch (err: any) {
      console.log(`ERROR: `, err);
    }
  }

  private async getDefiFees(bridgeSpec: BridgeSpec) {
    return await this.sdk.getDefiFees(getBridgeId(bridgeSpec));
  }

  private async getBalance(assetId = 0) {
    return await this.sdk.getMaxSpendableValue(this.user!.user.id, assetId, false, true, 2);
  }

  private async singleDefiSwap(spec: BridgeSpec, maxFee?: bigint, amountToTransfer = 0n) {
    const bridgeId = getBridgeId(spec);
    const fee = await this.agent.waitForMaxFee(() => this.getDefiFees(spec), DefiSettlementTime.DEADLINE, maxFee);
    if (amountToTransfer == 0n) {
      // the provided amount is zero, transfer everything we have after the fee is paid
      amountToTransfer = await this.getBalance(spec.inputAsset);
    }
    const inputAssetInfo = this.sdk.getAssetInfo(spec.inputAsset);
    const outputAssetInfo = this.sdk.getAssetInfo(spec.outputAsset);
    console.log(
      `agent ${this.id} swapping ${amountToTransfer} of asset ${inputAssetInfo.name} for ${outputAssetInfo.name} with fee ${fee.value}`,
    );
    const controller = await this.agent.executeUntilSucces(async () => {
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
    }, `defi deposit for agent ${this.id}`);
    return controller;
  }
}

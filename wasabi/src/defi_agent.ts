import { AztecSdk, BitConfig, BridgeId, EthAddress, MemoryFifo, toBaseUnits, WalletProvider } from '@aztec/sdk';
import { Agent } from './agent';
import { Stats } from './stats';

const BASE_GAS = 10000; // configured on falafel
const ETH_GAS_PRICE = 20000000000n;
const DAI_GAS_PRICE = 1000000000000000n;
const DAI_TO_ETH = 1000n;
//const DAI_GAS_PRICE = 1000000000000000n;

const formatNumber = (x: bigint) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

interface BridgeSpec {
  inputAsset: number;
  outputAsset: number;
  addressId: number;
  numTxs: number;
  gas: bigint;
  gasCost: bigint;
  rollupFrequency: number;
}

const bridgeConfigs: BridgeSpec[] = [
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000004000000000000001',
    inputAsset: 0,
    outputAsset: 1,
    addressId: 1,
    numTxs: 10,
    gas: 100000n,
    rollupFrequency: 2,
    gasCost: ETH_GAS_PRICE,
  },
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000000000000100000002',
    inputAsset: 0,
    outputAsset: 1,
    addressId: 2,
    numTxs: 10,
    gas: 100000n,
    rollupFrequency: 2,
    gasCost: DAI_GAS_PRICE,
  },
];

const getBridgeTxCost = (bridgeSpec: BridgeSpec) => {
  // the fee for a defi deposit isn't well defined over the sdk at the moment. we need to construct it ourselves
  const txGas = BigInt(BASE_GAS) + bridgeSpec.gas / BigInt(bridgeSpec.numTxs);
  const txFee = txGas * bridgeSpec.gasCost;
  return txFee;
};
/*
export class DefiAgent extends Agent {
  constructor(
    fundsSourceAddress: EthAddress,
    sdk: AztecSdk,
    provider: WalletProvider,
    id: number,
    private numTransferPairs: number,
  ) {
    super('Defi', fundsSourceAddress, sdk, id, provider);
  }

  protected getNumAdditionalUsers(): number {
    return 0;
  }

  public async run(stats: Stats) {
    try {
      this.sdk.awaitSettlement(await this.completePendingDeposit());
      stats.numDeposits++;
      for (let i = 0; i < this.numTransferPairs; i++) {
        console.log(`${this.agentId()} swapping ETH for DAI iteration: ${i}`);
        const transferValue =
          1000000n +
          getBridgeTxCost(bridgeConfigs[1]) / DAI_TO_ETH +
          (await this.sdk.getTransferFees(this.assetId))[0].value;
        await this.sdk.awaitSettlement(await this.singleDefiSwap(bridgeConfigs[0], (transferValue * 11n) / 10n));
        stats.numDefi++;
        console.log(`${this.agentId()} swapping DAI for ETH iteration: ${i}`);
        await this.sdk.awaitSettlement(await this.singleDefiSwap(bridgeConfigs[1], DAI_TO_ETH));
        stats.numDefi++;
      }
      await this.sdk.awaitSettlement(await this.withdraw());
      stats.numWithdrawals++;
    } catch (err: any) {
      console.log(`${this.agentId()} ERROR: `, err);
    }
  }

  protected getInitialDeposit() {
    return this.calcDeposit();
  }

  private async calcDeposit() {
    const assetId = this.assetId;
    // Nothing to do if we have a balance.
    if (this.sdk.getBalance(assetId, this.user.user.id)) {
      return;
    }
    const costOfEachTransfer =
      1000000n +
      getBridgeTxCost(bridgeConfigs[0]) +
      getBridgeTxCost(bridgeConfigs[1]) / DAI_TO_ETH +
      (await this.sdk.getTransferFees(assetId))[0].value * 2n;
    console.log(`DAI bridge cost: ${getBridgeTxCost(bridgeConfigs[1])}`);
    console.log(`Transfer cost: ${costOfEachTransfer}`);
    const depositFee = this.depositFee ?? (await this.sdk.getDepositFees(assetId))[0].value;
    const [{ value: withdrawFee }] = await this.sdk.getWithdrawFees(assetId);

    const ethToDeposit = 1n;
    let weiToDeposit = toBaseUnits(ethToDeposit.toString(), 18) + depositFee + withdrawFee + this.payoutFee;
    weiToDeposit += BigInt(this.numTransferPairs) * ((costOfEachTransfer * 11n) / 10n);

    console.log(`${this.agentId()} depositing ${formatNumber(weiToDeposit)} wei into account`);

    return weiToDeposit;
  }

  private singleDefiSwap = async (spec: BridgeSpec, amountToTransfer: bigint) => {
    const outputAssetIdB = 0;
    const bridgeId = new BridgeId(
      spec.addressId,
      spec.inputAsset,
      spec.outputAsset,
      outputAssetIdB,
      0,
      new BitConfig(false, false, false, false, false, false),
      0,
    );
    const currentBalanceInputAsset = this.sdk.getBalance(spec.inputAsset, this.user.user.id);
    const currentBalanceOutputAsset = this.sdk.getBalance(spec.outputAsset, this.user.user.id);
    console.log(
      `${this.agentId()} balances, ${spec.inputAsset}: ${formatNumber(currentBalanceInputAsset)}, ${
        spec.outputAsset
      }: ${formatNumber(currentBalanceOutputAsset)}`,
    );
    const txFee = getBridgeTxCost(spec);
    console.log(`${this.agentId()} defi fee: ${formatNumber(txFee)}`);
    const jsTxFee = (await this.sdk.getTransferFees(spec.inputAsset))[0].value;
    console.log(`${this.agentId()} JS fee: ${jsTxFee}`);
    console.log(
      `${this.agentId()} swapping ${formatNumber(amountToTransfer)} units of asset ${spec.inputAsset} for asset ${
        spec.outputAsset
      }`,
    );
    console.log(`${this.agentId()} building Defi proof`);
    const controller = this.sdk.createDefiController(
      this.user.user.id,
      this.user.signer,
      bridgeId,
      { assetId: spec.inputAsset, value: amountToTransfer },
      { assetId: spec.inputAsset, value: txFee + jsTxFee },
    );
    await controller.createProof();
    console.log(`${this.agentId()} sending Defi proof`);
    const hash = await controller.send();
    console.log(`${this.agentId()} sent Defi proof, defi hash: ${hash}`);
    return hash;
  };
}
*/
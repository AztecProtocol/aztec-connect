import {
  UnderlyingAsset,
  AuxDataConfig,
  AztecAsset,
  SolidityType,
  AztecAssetType,
  BridgeDataFieldGetters,
} from '../../bridge-data.js';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import {
  IWstETH,
  ILidoOracle,
  ICurvePool,
  IWstETH__factory,
  ILidoOracle__factory,
  ICurvePool__factory,
  IChainlinkOracle,
  IChainlinkOracle__factory,
} from '../../../typechain-types/index.js';
import { BridgeCallData, EthAddress, AssetValue } from '@aztec/sdk';

export class CurveStethBridgeData implements BridgeDataFieldGetters {
  public readonly scalingFactor: bigint = 1n * 10n ** 18n;
  public readonly wstEthAddress: EthAddress = EthAddress.fromString('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0');

  // Price precision
  public readonly PRECISION = 10n ** 18n;

  // Note: max setting has to be set significantly higher than the ideal setting in order for the aggregation to work
  public readonly IDEAL_SLIPPAGE_SETTING = 100n; // Denominated in basis points
  public readonly MAX_ACCEPTABLE_BATCH_SLIPPAGE_SETTING = this.IDEAL_SLIPPAGE_SETTING * 2n;

  private constructor(
    private bridgeAddressId: number,
    private wstETHContract: IWstETH,
    private lidoOracleContract: ILidoOracle,
    private curvePoolContract: ICurvePool,
    private chainlinkOracleContract: IChainlinkOracle,
  ) {}

  static create(
    bridgeAddressId: number,
    provider: StaticJsonRpcProvider,
    wstEthAddress: EthAddress,
    lidoOracleAddress: EthAddress,
    curvePoolAddress: EthAddress,
    chainlinkOracleAddress: EthAddress,
  ) {
    const wstEthContract = IWstETH__factory.connect(wstEthAddress.toString(), provider);
    const lidoContract = ILidoOracle__factory.connect(lidoOracleAddress.toString(), provider);
    const curvePoolContract = ICurvePool__factory.connect(curvePoolAddress.toString(), provider);
    // Precision of the feed is 1e18
    const chainlinkOracleContract = IChainlinkOracle__factory.connect(chainlinkOracleAddress.toString(), provider);
    return new CurveStethBridgeData(
      bridgeAddressId,
      wstEthContract,
      lidoContract,
      curvePoolContract,
      chainlinkOracleContract,
    );
  }

  // Unused
  public auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'Not Used',
    },
  ];

  // Lido bridge contract is stateless
  async getInteractionPresentValue(interactionNonce: number): Promise<AssetValue[]> {
    return [];
  }

  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    let ethToWstEth: boolean;
    if (
      inputAssetA.assetType === AztecAssetType.ETH &&
      inputAssetB.assetType === AztecAssetType.NOT_USED &&
      outputAssetA.erc20Address.equals(this.wstEthAddress) &&
      outputAssetB.assetType === AztecAssetType.NOT_USED
    ) {
      // Buying wstETH
      ethToWstEth = true;
    } else if (
      inputAssetA.erc20Address.equals(this.wstEthAddress) &&
      inputAssetB.assetType === AztecAssetType.NOT_USED &&
      outputAssetA.assetType === AztecAssetType.ETH &&
      outputAssetB.assetType === AztecAssetType.NOT_USED
    ) {
      // Selling wstETH
      ethToWstEth = false;
    } else {
      throw new Error('Incorrect combination of input/output assets.');
    }

    // Precision of the feed is 1e18
    const [, stEthPriceInEth, , ,] = await this.chainlinkOracleContract.latestRoundData();

    const oraclePrice = ethToWstEth ? 10n ** 36n / stEthPriceInEth.toBigInt() : stEthPriceInEth.toBigInt();

    const worstAcceptableBatchPrice = (oraclePrice * (10000n - this.MAX_ACCEPTABLE_BATCH_SLIPPAGE_SETTING)) / 10000n;

    const relevantAuxDatas = await this.fetchRelevantAuxDataFromFalafel(
      inputAssetA.id,
      outputAssetA.id,
      undefined,
      undefined,
    );

    for (const existingBatchPrice of relevantAuxDatas) {
      if (worstAcceptableBatchPrice <= existingBatchPrice && existingBatchPrice < oraclePrice) {
        return [existingBatchPrice];
      }
    }

    return [(oraclePrice * (10000n - this.IDEAL_SLIPPAGE_SETTING)) / 10000n];
  }

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    // ETH -> wstETH
    if (inputAssetA.assetType === AztecAssetType.ETH) {
      const stEthBalance = await this.curvePoolContract.get_dy(0, 1, inputValue);
      const wstETHBalance = await this.wstETHContract.getWstETHByStETH(stEthBalance);
      return [wstETHBalance.toBigInt()];
    }

    // wstETH -> ETH
    if (inputAssetA.assetType === AztecAssetType.ERC20) {
      const stETHBalance = await this.wstETHContract.getStETHByWstETH(inputValue);
      const ETHBalance = await this.curvePoolContract.get_dy(1, 0, stETHBalance);
      return [ETHBalance.toBigInt()];
    }
    return [0n];
  }
  async getAPR(yieldAsset: AztecAsset): Promise<number> {
    const YEAR = 60n * 60n * 24n * 365n;
    const { postTotalPooledEther, preTotalPooledEther, timeElapsed } =
      await this.lidoOracleContract.getLastCompletedReportDelta();

    const scaledAPR =
      ((postTotalPooledEther.toBigInt() - preTotalPooledEther.toBigInt()) * YEAR * this.scalingFactor) /
      (preTotalPooledEther.toBigInt() * timeElapsed.toBigInt());

    return Number(scaledAPR / (this.scalingFactor / 10000n)) / 100;
  }

  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    const { postTotalPooledEther } = await this.lidoOracleContract.getLastCompletedReportDelta();
    return [
      {
        assetId: inputAssetA.id,
        value: postTotalPooledEther.toBigInt(),
      },
    ];
  }

  async getUnderlyingAmount(asset: AztecAsset, amount: bigint): Promise<UnderlyingAsset> {
    if (!asset.erc20Address.equals(EthAddress.fromString('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'))) {
      throw new Error('Eth have no underlying');
    }
    const stETHBalance = await this.wstETHContract.getStETHByWstETH(amount);
    return {
      address: EthAddress.fromString('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'),
      name: 'Liquid staked Ether 2.0 ',
      symbol: 'stETH',
      decimals: 18,
      amount: stETHBalance.toBigInt(),
    };
  }

  private async fetchRelevantAuxDataFromFalafel(
    inputAssetIdA: number,
    outputAssetIdA: number,
    inputAssetIdB?: number,
    outputAssetIdB?: number,
  ): Promise<bigint[]> {
    const result = await (
      await fetch('https://api.aztec.network/aztec-connect-prod/falafel/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();

    const bridgeCallDatas: BridgeCallData[] = result.bridgeStatus.map((status: any) =>
      BridgeCallData.fromString(status.bridgeCallData),
    );

    const auxDatas: bigint[] = [];

    for (const bridgeCallData of bridgeCallDatas) {
      if (
        bridgeCallData.bridgeAddressId === this.bridgeAddressId &&
        bridgeCallData.inputAssetIdA === inputAssetIdA &&
        bridgeCallData.inputAssetIdB === inputAssetIdB &&
        bridgeCallData.outputAssetIdA === outputAssetIdA &&
        bridgeCallData.outputAssetIdB === outputAssetIdB
      ) {
        auxDatas.push(bridgeCallData.auxData);
      }
    }

    return auxDatas;
  }
}

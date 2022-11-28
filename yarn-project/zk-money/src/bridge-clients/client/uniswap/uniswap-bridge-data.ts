import { AuxDataConfig, AztecAsset, AztecAssetType, BridgeDataFieldGetters, SolidityType } from '../bridge-data.js';
import { BridgeCallData, EthAddress, EthereumProvider } from '@aztec/sdk';
import 'isomorphic-fetch';
import {
  IChainlinkOracle,
  IChainlinkOracle__factory,
  UniswapBridge,
  UniswapBridge__factory,
} from '../../typechain-types/index.js';
import { createWeb3Provider } from '../aztec/provider/web3_provider.js';

export class UniswapBridgeData implements BridgeDataFieldGetters {
  private readonly WETH = EthAddress.fromString('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
  private readonly USDC = EthAddress.fromString('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  private readonly DAI = EthAddress.fromString('0x6B175474E89094C44Da98b954EedeAC495271d0F');

  private readonly PATHS = {
    UNUSED: {
      percentage: 0,
      fee1: 0,
      token1: EthAddress.ZERO.toString(),
      fee2: 0,
      token2: EthAddress.ZERO.toString(),
      fee3: 0,
    },
    ETH_DAI: {
      percentage: 100,
      fee1: 500,
      token1: this.USDC.toString(),
      fee2: 100, // Ignored since unused
      token2: EthAddress.ZERO.toString(),
      fee3: 100,
    },
    DAI_ETH: {
      percentage: 100,
      fee1: 100,
      token1: this.USDC.toString(),
      fee2: 100, // Ignored since unused
      token2: EthAddress.ZERO.toString(),
      fee3: 500,
    },
  };

  // 0000000000000000000000000011111111111111111111111111111111111111
  public readonly PATH_MASK = 274877906943n;
  private readonly PRICE_SHIFT = 38n; // Price is encoded in the left-most 26 bits of auxData
  private readonly EXPONENT_MASK = 31n; // 00000000000000000000011111
  private readonly SIGNIFICAND_SHIFT = 5n; // Significand is encoded in the left-most 21 bits of price

  // Note: max setting has to be set significantly higher than the ideal setting in order for the aggregation to work
  public readonly IDEAL_SLIPPAGE_SETTING = 100n; // Denominated in basis points
  public readonly MAX_ACCEPTABLE_BATCH_SLIPPAGE_SETTING = this.IDEAL_SLIPPAGE_SETTING * 2n;

  private constructor(
    private bridgeAddressId: number,
    private uniswapBridge: UniswapBridge,
    private daiEthOracle: IChainlinkOracle,
  ) {}

  static create(provider: EthereumProvider, bridgeAddressId: number, bridgeAddress: EthAddress) {
    const ethersProvider = createWeb3Provider(provider);
    const uniswapBridge = UniswapBridge__factory.connect(bridgeAddress.toString(), ethersProvider);
    // Precision of the feeds is 1e18
    const chainlinkEthDaiOracle = IChainlinkOracle__factory.connect(
      '0x773616E4d11A78F511299002da57A0a94577F1f4',
      ethersProvider,
    );
    return new UniswapBridgeData(bridgeAddressId, uniswapBridge, chainlinkEthDaiOracle);
  }

  /**
   * @param inputAssetA A struct detailing the token to swap
   * @param inputAssetB Not used
   * @param outputAssetA A struct detailing the token to receive
   * @param outputAssetB Not used
   * @return The set of possible auxData values that they can use for a given set of input and output assets
   * @dev This function currently only works with hardcoded paths:
   *                           500     100
   *      ETH -> DAI path: ETH -> USDC -> DAI
   */
  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    let splitPath: UniswapBridge.SplitPathStruct;
    if (this.isEth(inputAssetA) && outputAssetA.erc20Address.equals(this.DAI)) {
      splitPath = this.PATHS['ETH_DAI'];
    } else if (inputAssetA.erc20Address.equals(this.DAI) && this.isEth(outputAssetA)) {
      splitPath = this.PATHS['DAI_ETH'];
    } else {
      throw new Error('The combination of input/output assets not supported');
    }

    const oraclePrice = await this.getInputPriceInOutputAsset(inputAssetA, outputAssetA);
    const worstAcceptableBatchPrice = (oraclePrice * (10000n - this.MAX_ACCEPTABLE_BATCH_SLIPPAGE_SETTING)) / 10000n;
    const worstAcceptableIdealPrice = (oraclePrice * (10000n - this.IDEAL_SLIPPAGE_SETTING)) / 10000n;

    // Now convert the price to a format used by the bridge
    // Bridge's encoding function works with `amountIn` and `minAmountOut` to encode the price so we'll pass it in in
    // that format --> we set `amountIn` in such a way that we `minAmountOut` can be equal to `priceIdealSetting`
    const amountIn = 10n ** 18n; // 1 ETH or 1 DAI on input
    const minAmountOut = worstAcceptableIdealPrice;

    const auxDataIdealSetting = (
      await this.uniswapBridge.encodePath(
        amountIn,
        minAmountOut,
        inputAssetA.assetType === AztecAssetType.ETH ? this.WETH.toString() : inputAssetA.erc20Address.toString(),
        splitPath,
        this.PATHS['UNUSED'],
      )
    ).toBigInt();

    const relevantAuxData = await this.fetchRelevantAuxDataFromFalafel(
      this.bridgeAddressId,
      inputAssetA.id,
      outputAssetA.id,
      auxDataIdealSetting & this.PATH_MASK,
    );

    // 1. Check if there is an interaction with acceptable minPrice --> acceptable minPrice is defined as a price
    //    which is smaller than current oracle price  and bigger than current oracle price with max slippage
    for (const auxData of relevantAuxData) {
      const existingBatchPrice = this.decodePrice(auxData);
      if (worstAcceptableBatchPrice <= existingBatchPrice && existingBatchPrice < oraclePrice) {
        return [auxData];
      }
    }

    // 2. If no acceptable auxData was found return a custom one
    return [auxDataIdealSetting];
  }

  public auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'Encoded swap path and min price',
    },
  ];

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    const inputAddr = inputAssetA.assetType === AztecAssetType.ETH ? this.WETH : inputAssetA.erc20Address;
    const outputAddr = outputAssetA.assetType === AztecAssetType.ETH ? this.WETH : outputAssetA.erc20Address;

    const quote = await this.uniswapBridge.callStatic.quote(
      inputValue,
      inputAddr.toString(),
      auxData,
      outputAddr.toString(),
    );

    return [quote.toBigInt()];
  }

  /**
   * @notice Updates `auxData` with `custom` slippage/price
   * @param auxData `auxData` in which to update the encode min price
   * @param customSlippage Slippage denominated in basis points
   * @param inputAssetA input asset to the swap
   * @param outputAssetA output asset of the swap
   * @return `auxData` with custom slippage
   */
  async updateAuxDataMinPrice(
    auxData: bigint,
    customSlippage: bigint,
    inputAssetA: AztecAsset,
    outputAssetA: AztecAsset,
  ): Promise<bigint> {
    const oraclePrice = await this.getInputPriceInOutputAsset(inputAssetA, outputAssetA);
    const worstAcceptablePrice = (oraclePrice * (10000n - customSlippage)) / 10000n;
    const encodedPrice = this.encodeMinPrice(worstAcceptablePrice);
    return (encodedPrice << this.PRICE_SHIFT) + (auxData & this.PATH_MASK);
  }

  decodePrice(auxData: bigint): bigint {
    const encodedPrice = auxData >> this.PRICE_SHIFT;
    const significand = encodedPrice >> this.SIGNIFICAND_SHIFT;
    const exponent = encodedPrice & this.EXPONENT_MASK;
    return significand * 10n ** exponent;
  }

  /**
   * @notice Returns price of input asset denominated in output asset
   * @param inputAssetA Asset to get the price for
   * @param outputAssetA Asset in which the return price is denominated
   * @return Price of input asset denominated in output asset
   */
  private async getInputPriceInOutputAsset(inputAssetA: AztecAsset, outputAssetA: AztecAsset): Promise<bigint> {
    // Note: this check will be replaced with fetching oracle from a map of oracles once Set token support is
    // implemented. I am having the check here now in order to indicate only ETH and DAI are supported.
    if (
      !(
        (this.isEth(inputAssetA) && outputAssetA.erc20Address.equals(this.DAI)) ||
        (inputAssetA.erc20Address.equals(this.DAI) && this.isEth(outputAssetA))
      )
    ) {
      throw new Error('The combination of input/output assets not supported by oracle');
    }

    // Precision of the feed is 1e18
    const [, daiPrice, , ,] = await this.daiEthOracle.latestRoundData();
    return inputAssetA.erc20Address.equals(this.DAI) ? daiPrice.toBigInt() : 10n ** 36n / daiPrice.toBigInt();
  }

  private async fetchRelevantAuxDataFromFalafel(
    bridgeAddressId: number,
    inputAssetIdA: number,
    outputAssetIdA: number,
    encodedPath: bigint,
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
        bridgeCallData.bridgeAddressId === bridgeAddressId &&
        bridgeCallData.inputAssetIdA === inputAssetIdA &&
        bridgeCallData.outputAssetIdA === outputAssetIdA &&
        (bridgeCallData.auxData & this.PATH_MASK) === encodedPath
      ) {
        auxDatas.push(bridgeCallData.auxData);
      }
    }

    return auxDatas;
  }

  // @dev A re-implementation of UniswapBridge's `_computeEncodedMinPrice` function
  private encodeMinPrice(minPrice: bigint): bigint {
    if (minPrice <= 2097151) {
      // minPrice is smaller than the boundary of significand --> significand = _x, exponent = 0
      return minPrice << 5n;
    } else {
      let exponent = 0n;
      while (minPrice > 2097151) {
        minPrice /= 10n;
        ++exponent;
        // 31 = 2**5 - 1 --> max exponent
        if (exponent > 31) throw Error('Overflow: minPrice could not be encoded');
      }
      return (minPrice << 5n) + exponent;
    }
  }

  // @notice Returns boolean indicating whether asset is ETH or WETH
  private isEth(asset: AztecAsset): boolean {
    return asset.assetType === AztecAssetType.ETH || asset.erc20Address.equals(this.WETH);
  }
}

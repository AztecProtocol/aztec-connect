import { UnderlyingAsset, AuxDataConfig, AztecAsset, SolidityType, BridgeDataFieldGetters } from '../bridge-data.js';

import { BiDCABridge, BiDCABridge__factory, IERC20__factory } from '../../typechain-types/index.js';
import { createWeb3Provider } from '../aztec/provider/web3_provider.js';
import { EthereumProvider, EthAddress, AssetValue } from '@aztec/sdk';

export class DCABridgeData implements BridgeDataFieldGetters {
  public scalingFactor: bigint = 1n * 10n ** 18n;
  public dcaLength = 7n;

  private constructor(private bidcaContract: BiDCABridge) {}

  static create(provider: EthereumProvider, dcaAddress: EthAddress) {
    const ethersProvider = createWeb3Provider(provider);
    const bidcaContract = BiDCABridge__factory.connect(dcaAddress.toString(), ethersProvider);
    return new DCABridgeData(bidcaContract);
  }

  public auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'Number of ticks to DCA over',
    },
  ];

  async getInteractionPresentValue(interactionNonce: number, inputValue: bigint): Promise<AssetValue[]> {
    const position = await this.bidcaContract.getDCA(interactionNonce);

    const tickAmount = position.amount.div(position.end - position.start);
    const aToB = position.aToB;

    let boughtSum = 0n;
    let soldSum = 0n;

    for (let i = position.start; i < position.end; i++) {
      const tick = await this.bidcaContract.getTick(i);

      const [avail, sold, bought] = aToB
        ? [tick.availableA, tick.aToBSubTick.sold, tick.aToBSubTick.bought]
        : [tick.availableB, tick.bToASubTick.sold, tick.bToASubTick.bought];

      if (sold.add(avail).gt(0)) {
        // The amount of tokens bought that is mine = bought * my fraction
        const boughtTick = bought.mul(tickAmount).div(sold.add(avail));
        // The amount of tokens sold that was mine = sold * my fraction
        const soldTick = sold.mul(tickAmount).div(sold.add(avail));
        boughtSum += boughtTick.toBigInt();
        soldSum += soldTick.toBigInt();
      }
    }

    return [
      {
        assetId: aToB ? 1 : 0,
        value: ((position.amount.toBigInt() - soldSum) * inputValue) / position.amount.toBigInt(),
      },
      {
        assetId: !aToB ? 1 : 0,
        value: (boughtSum * inputValue) / position.amount.toBigInt(),
      },
    ];
  }

  // Will always return 7
  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    return [this.dcaLength];
  }

  // Not useful for this bridge. Unknown at time of execution.
  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    return [0n];
  }

  // Not useful
  async getAPR(yieldAsset: AztecAsset): Promise<number> {
    return 0;
  }

  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    const input = IERC20__factory.connect(inputAssetA.erc20Address.toString(), this.bidcaContract.provider);
    const output = IERC20__factory.connect(outputAssetA.erc20Address.toString(), this.bidcaContract.provider);

    return [
      {
        assetId: outputAssetA.id,
        value: (await output.balanceOf(this.bidcaContract.address)).toBigInt(),
      },
      {
        assetId: inputAssetA.id,
        value: (await input.balanceOf(this.bidcaContract.address)).toBigInt(),
      },
    ];
  }

  async getUnderlyingAmount(asset: AztecAsset, amount: bigint): Promise<UnderlyingAsset> {
    throw new Error('Not useful information in this bridge');
  }
}

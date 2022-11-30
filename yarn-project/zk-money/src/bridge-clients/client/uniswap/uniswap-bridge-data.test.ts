import { BridgeCallData, EthAddress, JsonRpcProvider } from '@aztec/sdk';
import { BigNumber } from 'ethers';
import {
  IChainlinkOracle,
  IChainlinkOracle__factory,
  UniswapBridge,
  UniswapBridge__factory,
} from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { UniswapBridgeData } from './uniswap-bridge-data.js';
import { jest } from '@jest/globals';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('uniswap bridge data', () => {
  const bridgeAddressId = 17;
  const bridgeAddress = EthAddress.fromString('0xF1e6bebb1ab5621b24Df695C16c1641515BB5926');

  let uniswapBridge: Mockify<UniswapBridge>;
  let chainlinkOracle: Mockify<IChainlinkOracle>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let daiAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    ethAsset = {
      id: 0,
      assetType: AztecAssetType.ETH,
      erc20Address: EthAddress.ZERO,
    };
    daiAsset = {
      id: 1,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly get auxData on ETH to DAI swap when there are no acceptable auxData in Falafel', async () => {
    // A bridgeCallData with correct path but a min price set too high (1570 DAI per ETH while the oracle DAI price
    // corresponds to 1088 DAI per ETH)
    const referenceBridgeCallData = '00bfa683f2280000000000000000000000000000100000000000000000000011';
    const referenceDaiPrice = 918760420783020n;

    // Setup mocks
    const mockedData = {
      bridgeStatus: [
        {
          bridgeCallData: referenceBridgeCallData,
        },
        {
          bridgeCallData: '000000000000000001000000000000000000000020000000000000060000000a',
        },
      ],
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    chainlinkOracle = {
      ...chainlinkOracle,
      latestRoundData: jest
        .fn()
        .mockReturnValue([BigNumber.from(0), BigNumber.from(referenceDaiPrice), BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;

    // Initialize the class and get the auxData to check
    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const auxData = (await uniswapBridgeData.getAuxData(ethAsset, emptyAsset, daiAsset, emptyAsset))[0];

    // auxData should be different from the ones in Falafel containing the same path but unacceptable price
    const referenceAuxData = BridgeCallData.fromString(referenceBridgeCallData).auxData;
    expect(auxData === referenceAuxData).toBeFalsy();

    // Check that the path is set the same as in 1st bridgeCallData in mockedData
    expect(referenceAuxData & uniswapBridgeData.PATH_MASK).toBe(auxData & uniswapBridgeData.PATH_MASK);

    // Converting both prices here to a lower precision because there is a precision loss when encoding the price
    // as a float in the bridge (I convert 1066654568298434253328 to 1066 --> meaning of this is 1066 DAI per ETH)
    const referencePriceWithIdealSlippage =
      ((10n ** 36n / referenceDaiPrice) * (10000n - uniswapBridgeData.IDEAL_SLIPPAGE_SETTING)) / 10000n / 10n ** 18n;
    const priceWithIdealSlippage = uniswapBridgeData.decodePrice(auxData) / 10n ** 18n;
    expect(priceWithIdealSlippage).toBe(referencePriceWithIdealSlippage);
  });

  it('should correctly get auxData on ETH to DAI swap from Falafel when there are acceptable ones', async () => {
    // A bridgeCallData with correct acceptable price (1570 DAI per ETH while the oracle DAI price corresponds
    // to 1590 DAI per ETH)
    const referenceBridgeCallData = '00bfa683f2280000000000000000000000000000100000000000000000000011';
    const referenceDaiPrice = 628760420783020n;

    // Setup mocks
    const mockedData = {
      bridgeStatus: [
        {
          bridgeCallData: referenceBridgeCallData,
        },
        {
          bridgeCallData: '000000000000000001000000000000000000000020000000000000060000000a',
        },
      ],
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    chainlinkOracle = {
      ...chainlinkOracle,
      latestRoundData: jest
        .fn()
        .mockReturnValue([BigNumber.from(0), BigNumber.from(referenceDaiPrice), BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;

    // Initialize the class and get the auxData to check
    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const auxData = (await uniswapBridgeData.getAuxData(ethAsset, emptyAsset, daiAsset, emptyAsset))[0];

    const referenceAuxData = BridgeCallData.fromString(referenceBridgeCallData).auxData;
    expect(auxData).toBe(referenceAuxData);
  });

  it('should correctly get auxData on DAI to ETH swap when there are no acceptable auxData in Falafel', async () => {
    // A bridgeCallData with correct path but a min price set too low (reference DAI price corresponding to 820 DAI
    // per ETH and the price in reference call data corresponding to more than 1000 DAI per ETH)
    const referenceBridgeCallData = '006DE90A72080800000000000000000000000000000000000000000100000011';
    const referenceDaiPrice = 1218760420783020n;

    // Setup mocks
    const mockedData = {
      bridgeStatus: [
        {
          bridgeCallData: referenceBridgeCallData,
        },
        {
          bridgeCallData: '000000000000000001000000000000000000000020000000000000060000000a',
        },
      ],
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    chainlinkOracle = {
      ...chainlinkOracle,
      latestRoundData: jest
        .fn()
        .mockReturnValue([BigNumber.from(0), BigNumber.from(referenceDaiPrice), BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;

    // Initialize the class and get the auxData to check
    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const auxData = (await uniswapBridgeData.getAuxData(daiAsset, emptyAsset, ethAsset, emptyAsset))[0];

    // auxData should be different from the ones in Falafel containing the same path but unacceptable price
    const referenceAuxData = BridgeCallData.fromString(referenceBridgeCallData).auxData;
    expect(auxData === referenceAuxData).toBeFalsy();

    // Check that the path is set the same as in 1st bridgeCallData in mockedData
    expect(referenceAuxData & uniswapBridgeData.PATH_MASK).toBe(auxData & uniswapBridgeData.PATH_MASK);

    // Converting both prices here to a lower precision because there is a precision loss when encoding the price
    // as a float in the bridge (I convert 1066654568298434253328 to 1066 --> meaning of this is 1066 DAI per ETH)
    const referencePriceWithIdealSlippage =
      (referenceDaiPrice * (10000n - uniswapBridgeData.IDEAL_SLIPPAGE_SETTING)) / 10000n / 10n ** 9n;
    const priceWithIdealSlippage = uniswapBridgeData.decodePrice(auxData) / 10n ** 9n;
    expect(priceWithIdealSlippage).toBe(referencePriceWithIdealSlippage);
  });

  it('should correctly get auxData on DAI to ETH swap from Falafel when there are acceptable ones', async () => {
    // A bridgeCallData with correct path and an acceptable minPrice
    const referenceBridgeCallData = '006DE90A72080800000000000000000000000000000000000000000100000011';
    const referenceDaiPrice = 908760420783020n;

    // Setup mocks
    const mockedData = {
      bridgeStatus: [
        {
          bridgeCallData: referenceBridgeCallData,
        },
        {
          bridgeCallData: '000000000000000001000000000000000000000020000000000000060000000a',
        },
      ],
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    chainlinkOracle = {
      ...chainlinkOracle,
      latestRoundData: jest
        .fn()
        .mockReturnValue([BigNumber.from(0), BigNumber.from(referenceDaiPrice), BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;

    // Initialize the class and get the auxData to check
    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const auxData = (await uniswapBridgeData.getAuxData(daiAsset, emptyAsset, ethAsset, emptyAsset))[0];

    const referenceAuxData = BridgeCallData.fromString(referenceBridgeCallData).auxData;
    expect(auxData).toBe(referenceAuxData);
  });

  it('should correctly get expected output', async () => {
    const referenceQuote = 1126537521158978672792n;

    // Setup mocks
    uniswapBridge = {
      ...uniswapBridge,
      callStatic: { quote: jest.fn().mockReturnValue(BigNumber.from(referenceQuote)) },
    };
    UniswapBridge__factory.connect = () => uniswapBridge as any;

    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);

    // Get expected output
    const expectedOutput = (
      await uniswapBridgeData.getExpectedOutput(
        ethAsset,
        emptyAsset,
        daiAsset,
        emptyAsset,
        5521820452755865600n,
        10n ** 18n,
      )
    )[0];

    // Check the output is equal to reference quote
    expect(expectedOutput).toBe(referenceQuote);
  });

  it('should correctly update auxData minPrice', async () => {
    const referenceDaiPrice = 918760420783020n;
    const auxData = 2n ** 64n - 1n;
    const newSlippage = 1000n; // 10 %

    // Setup mocks
    chainlinkOracle = {
      ...chainlinkOracle,
      latestRoundData: jest
        .fn()
        .mockReturnValue([BigNumber.from(0), BigNumber.from(referenceDaiPrice), BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;

    const uniswapBridgeData = UniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);

    const updatedAuxData = await uniswapBridgeData.updateAuxDataMinPrice(auxData, newSlippage, ethAsset, daiAsset);

    // Converting both prices here to a lower precision because there is a precision loss when encoding the price
    // as a float in the bridge (I convert 1197265331763548651695 to 1197 --> meaning of this is 1197 DAI per ETH)
    const expectedMinPrice =
      (BigNumber.from('1000000000000000000000000000000000000').div(referenceDaiPrice).toBigInt() *
        (10000n - newSlippage)) /
      10000n /
      10n ** 18n;
    const decodedUpdatedMinPrice = uniswapBridgeData.decodePrice(updatedAuxData) / 10n ** 18n;

    expect(decodedUpdatedMinPrice).toBe(expectedMinPrice);
  });
});

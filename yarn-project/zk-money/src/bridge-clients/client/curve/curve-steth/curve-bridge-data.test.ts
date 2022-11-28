import { CurveStethBridgeData } from './curve-bridge-data.js';
import {
  IWstETH,
  ICurvePool,
  ILidoOracle,
  IWstETH__factory,
  ICurvePool__factory,
  ILidoOracle__factory,
  IChainlinkOracle,
  IChainlinkOracle__factory,
} from '../../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../../bridge-data.js';
import { BigNumber } from 'ethers';
import { jest } from '@jest/globals';
import { BridgeCallData, EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('curve steth bridge data', () => {
  const bridgeAddressId = 17;

  let curveBridgeData: CurveStethBridgeData;
  let wstethContract: Mockify<IWstETH>;
  let curvePoolContract: Mockify<ICurvePool>;
  let lidoOracleContract: Mockify<ILidoOracle>;
  let chainlinkOracleContract: Mockify<IChainlinkOracle>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let wstETHAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  const createCurveStethBridgeData = (
    wsteth: IWstETH = wstethContract as any,
    curvePool: ICurvePool = curvePoolContract as any,
    lidoOracle: ILidoOracle = lidoOracleContract as any,
    chainlinkOracle: IChainlinkOracle = chainlinkOracleContract as any,
  ) => {
    IWstETH__factory.connect = () => wsteth as any;
    ICurvePool__factory.connect = () => curvePool as any;
    ILidoOracle__factory.connect = () => lidoOracle as any;
    IChainlinkOracle__factory.connect = () => chainlinkOracle as any;
    // Can pass in dummy values bellow as the above factories do all of the work
    return CurveStethBridgeData.create(
      bridgeAddressId,
      provider,
      EthAddress.ZERO,
      EthAddress.ZERO,
      EthAddress.ZERO,
      EthAddress.ZERO,
    );
  };

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    ethAsset = {
      id: 0,
      assetType: AztecAssetType.ETH,
      erc20Address: EthAddress.ZERO,
    };
    wstETHAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('sets auxData from Falafel when there is a batch with acceptable price on wstETH->ETH swap', async () => {
    const referenceBridgeCallData = '000D873B90F0335E180000000000000000000000000000000000000200000011';
    const stEthOraclePriceInEth = BigNumber.from('979711897527868700');

    // Setup mocks
    const falafelResponse = {
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
        json: () => Promise.resolve(falafelResponse),
      }),
    ) as any;

    chainlinkOracleContract = {
      ...chainlinkOracleContract,
      latestRoundData: jest
        .fn()
        .mockReturnValueOnce([BigNumber.from(0), stEthOraclePriceInEth, BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracleContract as any;

    const curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const auxData = await curveBridgeData.getAuxData(wstETHAsset, emptyAsset, ethAsset, emptyAsset);

    // The price in Falafel is acceptable so check that it was chosen
    expect(auxData[0]).toBe(BridgeCallData.fromString(referenceBridgeCallData).auxData);
  });

  it('sets auxData from Falafel when there is a batch with acceptable price on ETH->wstETH swap', async () => {
    const referenceBridgeCallData = '000E05D6CB0E9FC4280000000000000000000000200000000000000000000011';
    const stEthOraclePriceInEth = BigNumber.from('979711897527868700');

    // Setup mocks
    const falafelResponse = {
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
        json: () => Promise.resolve(falafelResponse),
      }),
    ) as any;

    chainlinkOracleContract = {
      ...chainlinkOracleContract,
      latestRoundData: jest
        .fn()
        .mockReturnValueOnce([BigNumber.from(0), stEthOraclePriceInEth, BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracleContract as any;

    const curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const auxData = await curveBridgeData.getAuxData(ethAsset, emptyAsset, wstETHAsset, emptyAsset);

    // The price in Falafel is acceptable so check that it was chosen
    expect(auxData[0]).toBe(BridgeCallData.fromString(referenceBridgeCallData).auxData);
  });

  it('sets custom auxData when there are no acceptable ones in Falafel', async () => {
    const referenceBridgeCallData = '000D873B90F0335E180000000000000000000000000000000000000200000011';
    const stEthOraclePriceInEth = BigNumber.from('102869749240426210');

    // Setup mocks
    const falafelResponse = {
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
        json: () => Promise.resolve(falafelResponse),
      }),
    ) as any;

    chainlinkOracleContract = {
      ...chainlinkOracleContract,
      latestRoundData: jest
        .fn()
        .mockReturnValueOnce([BigNumber.from(0), stEthOraclePriceInEth, BigNumber.from(0), BigNumber.from(0)]),
    };
    IChainlinkOracle__factory.connect = () => chainlinkOracleContract as any;

    const curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const auxData = await curveBridgeData.getAuxData(wstETHAsset, emptyAsset, ethAsset, emptyAsset);

    // The price in Falafel is not acceptable so check that it was not chosen
    expect(auxData[0] === BridgeCallData.fromString(referenceBridgeCallData).auxData).toBeFalsy();
  });

  it('should get wstETH when deposit small amount of ETH', async () => {
    const depositAmount = BigInt(10e18);
    const stEthAmountOut = BigInt(10.3e18);
    const wstEthAmount = BigInt(9.7e18);
    const expectedOutput = wstEthAmount;

    curvePoolContract = {
      ...curvePoolContract,
      get_dy: jest.fn().mockReturnValue(BigNumber.from(stEthAmountOut)),
    };

    wstethContract = {
      ...wstethContract,
      getWstETHByStETH: jest.fn().mockReturnValue(BigNumber.from(wstEthAmount)),
    };

    curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const output = await curveBridgeData.getExpectedOutput(
      ethAsset,
      emptyAsset,
      wstETHAsset,
      emptyAsset,
      0n,
      depositAmount,
    );
    expect(expectedOutput === output[0]).toBeTruthy();
  });

  it('should get wstETH when deposit a large amount of ETH', async () => {
    const depositAmount = BigInt(10000e18);
    const stEthAmountOut = BigInt(10300e18);
    const wstEthAmount = BigInt(9700e18);
    const expectedOutput = wstEthAmount;

    curvePoolContract = {
      ...curvePoolContract,
      get_dy: jest.fn().mockReturnValue(BigNumber.from(stEthAmountOut)),
    };

    wstethContract = {
      ...wstethContract,
      getWstETHByStETH: jest.fn().mockReturnValue(BigNumber.from(wstEthAmount)),
      getStETHByWstETH: jest.fn().mockReturnValue(BigNumber.from(stEthAmountOut)),
    };

    curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const output = await curveBridgeData.getExpectedOutput(
      ethAsset,
      emptyAsset,
      wstETHAsset,
      emptyAsset,
      0n,
      depositAmount,
    );
    expect(expectedOutput === output[0]).toBeTruthy();

    const underlying = await curveBridgeData.getUnderlyingAmount(wstETHAsset, expectedOutput);
    expect(underlying.amount === stEthAmountOut).toBeTruthy();
  });
  it('should exit to ETH when deposit WstETH', async () => {
    const depositAmount = BigInt(100e18);
    const stethOutputAmount = BigInt(110e18);
    const expectedOutput = BigInt(105e18);

    wstethContract = {
      ...wstethContract,
      getStETHByWstETH: jest.fn().mockReturnValue(BigNumber.from(stethOutputAmount)),
    };

    curvePoolContract = {
      ...curvePoolContract,
      get_dy: jest.fn().mockReturnValue(BigNumber.from(expectedOutput)),
    };

    curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const output = await curveBridgeData.getExpectedOutput(
      wstETHAsset,
      emptyAsset,
      ethAsset,
      emptyAsset,
      0n,
      depositAmount,
    );

    expect(expectedOutput === output[0]).toBeTruthy();
  });

  it('should correctly return the expected APR', async () => {
    const expectedAPR = 4.32;

    wstethContract = {
      ...wstethContract,
      getStETHByWstETH: jest.fn().mockImplementation(async input => {
        // force WSTETH and STETH to have the same value
        // @ts-ignore
        return BigNumber.from((BigInt(input) * 100n) / 100n);
      }),
    };

    curvePoolContract = {
      ...curvePoolContract,

      get_dy: jest.fn().mockImplementation(async (x, y, input) => {
        // force ETH and STETH to have the same value
        // @ts-ignore
        return BigNumber.from((BigInt(input) * 100n) / 100n);
      }),
    };

    lidoOracleContract = {
      ...lidoOracleContract,
      getLastCompletedReportDelta: jest.fn().mockReturnValue({
        timeElapsed: BigNumber.from(86400n),
        postTotalPooledEther: BigNumber.from(2777258873714679039007057n),
        preTotalPooledEther: BigNumber.from(2776930205843708039007057n),
      }),
    };

    curveBridgeData = createCurveStethBridgeData(
      wstethContract as any,
      curvePoolContract as any,
      lidoOracleContract as any,
    );

    const APR = await curveBridgeData.getAPR(wstETHAsset);
    expect(APR).toBe(expectedAPR);
  });
});

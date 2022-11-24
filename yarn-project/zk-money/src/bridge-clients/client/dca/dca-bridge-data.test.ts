import { DCABridgeData } from './dca-bridge-data.js';
import { BiDCABridge, BiDCABridge__factory } from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { BigNumber } from 'ethers';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('DCA bridge data', () => {
  let dcaBridgeData: DCABridgeData;
  let dcaBridgeContract: Mockify<BiDCABridge>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let daiAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  const createDCABridge = (dcaBridge: BiDCABridge = dcaBridgeContract as any) => {
    BiDCABridge__factory.connect = () => dcaBridge as any;
    return DCABridgeData.create(provider, EthAddress.ZERO);
  };

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
      erc20Address: EthAddress.random(),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('get interaction present value', async () => {
    type DCA = {
      amount: BigNumber;
      start: number;
      end: number;
      aToB: boolean;
    };

    type Tick = {
      availableA: BigNumber;
      availableB: BigNumber;
      poke: number;
      aToBSubTick: {
        sold: BigNumber;
        bought: BigNumber;
      };
      bToASubTick: {
        sold: BigNumber;
        bought: BigNumber;
      };
      priceOfAInB: BigNumber;
      priceTime: number;
    };

    const dcas: {
      [key: number]: DCA;
    } = {
      0: {
        amount: BigNumber.from(10).pow(18).mul(7),
        start: 0,
        end: 7,
        aToB: true,
      },
    };

    const base: Tick = {
      availableA: dcas[0].amount.div(7),
      availableB: BigNumber.from(0),
      poke: 0,
      aToBSubTick: {
        sold: BigNumber.from(0),
        bought: BigNumber.from(0),
      },
      bToASubTick: {
        sold: BigNumber.from(0),
        bought: BigNumber.from(0),
      },
      priceOfAInB: BigNumber.from(10).pow(18).div(1000),
      priceTime: 0,
    };

    const ticks: {
      [key: number]: Tick;
    } = {
      0: base,
      1: {
        ...base,
        availableA: BigNumber.from(0),
        aToBSubTick: {
          sold: base.availableA,
          bought: base.availableA.div(1000),
        },
      },
      2: {
        ...base,
        availableA: base.availableA.div(2),
        aToBSubTick: {
          sold: base.availableA.div(2),
          bought: base.availableA.div(2000),
        },
      },
    };

    dcaBridgeContract = {
      ...dcaBridgeContract,
      // @ts-ignore
      getDCA: jest.fn().mockImplementation((_nonce: number) => dcas[_nonce]),
      // @ts-ignore
      getTick: jest.fn().mockImplementation((_tick: number) => (ticks[_tick] === undefined ? base : ticks[_tick])),
    };

    dcaBridgeData = createDCABridge(dcaBridgeContract as any);

    // User owned half the batch
    const inputValue = dcas[0].amount.toBigInt() / 2n;
    const res = await dcaBridgeData.getInteractionPresentValue(0, inputValue);

    expect(res[0]).toEqual({
      assetId: 1,
      value: (55n * 10n ** 18n) / 10n / 2n,
    });
    expect(res[1]).toEqual({
      assetId: 0,
      value: (15n * 10n ** 18n) / 10000n / 2n,
    });
  });

  it('get market size', async () => {});

  it('get aux data', async () => {
    dcaBridgeData = createDCABridge(dcaBridgeContract as any);
    const result = await dcaBridgeData.getAuxData(emptyAsset, emptyAsset, emptyAsset, emptyAsset);
    expect(result[0]).toBe(7n);
  });

  it('get expected output', async () => {
    dcaBridgeData = createDCABridge(dcaBridgeContract as any);
    const result = await dcaBridgeData.getExpectedOutput(
      ethAsset,
      emptyAsset,
      daiAsset,
      emptyAsset,
      0n,
      10n * 10n ** 18n,
    );
    expect(result[0]).toBe(0n);
  });

  it('get underlying amount', async () => {
    dcaBridgeData = createDCABridge(dcaBridgeContract as any);
    await expect(dcaBridgeData.getUnderlyingAmount(ethAsset, 10n * 10n ** 18n)).rejects.toEqual(
      new Error('Not useful information in this bridge'),
    );
  });

  it('get apr', async () => {
    dcaBridgeData = createDCABridge(dcaBridgeContract as any);
    expect(await dcaBridgeData.getAPR(ethAsset)).toEqual(0);
  });
});

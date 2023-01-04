import { EthAddress, JsonRpcProvider } from '@aztec/sdk';
import { jest } from '@jest/globals';
import { BigNumber } from 'ethers';
import { IERC20, IERC20__factory } from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { SetUniswapBridgeData } from './set-uniswap-bridge-data.js';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('uniswap bridge data', () => {
  const bridgeAddressId = 17;
  const bridgeAddress = EthAddress.fromString('0xF1e6bebb1ab5621b24Df695C16c1641515BB5926');

  let erc20Contract: Mockify<IERC20>;

  let provider: JsonRpcProvider;

  let icethAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    icethAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x7C07F7aBe10CE8e33DC6C5aD68FE033085256A84'),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly get APR', async () => {
    // Setup mocks
    const mockedData = { apy: '3610836607814677500' };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    const setUniswapBridgeData = SetUniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const APR = await setUniswapBridgeData.getAPR(icethAsset);

    expect(APR).toBe(3.6108366078146775);
  });

  it('should correctly get market size', async () => {
    // Setup mocks
    erc20Contract = {
      ...erc20Contract,
      totalSupply: jest.fn().mockReturnValue(BigNumber.from('123456789')),
    };
    IERC20__factory.connect = () => erc20Contract as any;

    const setUniswapBridgeData = SetUniswapBridgeData.create(provider, bridgeAddressId, bridgeAddress);
    const marketSize = (
      await setUniswapBridgeData.getMarketSize(emptyAsset, emptyAsset, icethAsset, emptyAsset, 0n)
    )[0];

    expect(marketSize.assetId).toBe(icethAsset.id);
    expect(marketSize.value).toBe(123456789n);
  });
});

import { IERC4626, IERC4626__factory } from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { AaveV2BridgeData } from './aavev2-bridge-data.js';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('AaveV2 bridge data', () => {
  let erc4626Contract: Mockify<IERC4626>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let wa2DaiAsset: AztecAsset;
  let daiAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    ethAsset = {
      id: 0,
      assetType: AztecAssetType.ETH,
      erc20Address: EthAddress.ZERO,
    };
    wa2DaiAsset = {
      id: 7,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xbcb91e0B4Ad56b0d41e0C168E3090361c0039abC'),
    };
    daiAsset = {
      id: 1,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x6b175474e89094c44da98b954eedeac495271d0f'),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly fetch APR', async () => {
    erc4626Contract = {
      ...erc4626Contract,
      asset: jest.fn().mockReturnValue(daiAsset.erc20Address.toString()),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const aavev2BridgeData = AaveV2BridgeData.create(provider);
    const apr = await aavev2BridgeData.getAPR(wa2DaiAsset);
    expect(apr).toBeGreaterThan(0);
  });

  it('should correctly fetch market size', async () => {
    const aaveV2BridgeData = AaveV2BridgeData.create(provider);
    const assetValue = (await aaveV2BridgeData.getMarketSize(daiAsset, emptyAsset, emptyAsset, emptyAsset, 0n))[0];
    expect(assetValue.assetId).toBe(daiAsset.id);
    expect(assetValue.value).toBeGreaterThan(0);
  });

  it('should correctly fetch market size for ETH', async () => {
    const aaveV2BridgeData = AaveV2BridgeData.create(provider);
    const assetValue = (await aaveV2BridgeData.getMarketSize(ethAsset, emptyAsset, emptyAsset, emptyAsset, 0n))[0];
    expect(assetValue.assetId).toBe(ethAsset.id);
    expect(assetValue.value).toBeGreaterThan(0);
  });
});

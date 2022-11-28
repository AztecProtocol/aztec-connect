import { BigNumber } from 'ethers';
import {
  ICERC20,
  ICERC20__factory,
  ICompoundERC4626,
  ICompoundERC4626__factory,
  IERC20,
  IERC20__factory,
} from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { CompoundBridgeData } from './compound-bridge-data.js';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('compound lending bridge data', () => {
  let compoundERC4626Contract: Mockify<ICompoundERC4626>;
  let cerc20Contract: Mockify<ICERC20>;
  let erc20Contract: Mockify<IERC20>;

  let provider: JsonRpcProvider;

  let daiAsset: AztecAsset;
  let wcdaiAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    daiAsset = {
      id: 1,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
    };
    wcdaiAsset = {
      id: 12, // Asset has not yet been registered on RollupProcessor so this id is random
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.random(),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly compute expected APR', async () => {
    // Setup mocks
    compoundERC4626Contract = {
      ...compoundERC4626Contract,
      cToken: jest.fn().mockReturnValue('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643'),
    };
    ICompoundERC4626__factory.connect = () => compoundERC4626Contract as any;

    cerc20Contract = {
      ...cerc20Contract,
      supplyRatePerBlock: jest.fn().mockReturnValue(BigNumber.from('338149955')),
    };
    ICERC20__factory.connect = () => cerc20Contract as any;
    const compoundBridgeData = CompoundBridgeData.create(provider);

    // Test the code using mocked controller
    const APR = await compoundBridgeData.getAPR(wcdaiAsset);
    expect(APR).toBe(0.0710926465392);
  });

  it('should correctly compute market size', async () => {
    // Setup mocks
    compoundERC4626Contract = {
      ...compoundERC4626Contract,
      cToken: jest.fn().mockReturnValue('0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643'),
    };
    ICompoundERC4626__factory.connect = () => compoundERC4626Contract as any;

    erc20Contract = {
      ...erc20Contract,
      balanceOf: jest.fn().mockReturnValue(BigNumber.from('354266465288194354360018823')),
    };
    IERC20__factory.connect = () => erc20Contract as any;

    cerc20Contract = {
      ...cerc20Contract,
      totalBorrows: jest.fn().mockReturnValue(BigNumber.from('302183964811046170986358904')),
    };
    IERC20__factory.connect = () => erc20Contract as any;

    const compoundBridgeData = CompoundBridgeData.create(provider);

    // Test the code using mocked controller
    const marketSizeMint = (
      await compoundBridgeData.getMarketSize(daiAsset, emptyAsset, wcdaiAsset, emptyAsset, 0n)
    )[0];
    const marketSizeRedeem = (
      await compoundBridgeData.getMarketSize(wcdaiAsset, emptyAsset, daiAsset, emptyAsset, 1n)
    )[0];
    expect(marketSizeMint.value).toBe(marketSizeRedeem.value);
    expect(marketSizeMint.value).toBe(656450430099240525346377727n);
  });
});

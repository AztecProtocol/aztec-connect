import { BigNumber } from 'ethers';
import { IERC20Metadata, IERC20Metadata__factory, IERC4626, IERC4626__factory } from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { ERC4626BridgeData } from './erc4626-bridge-data.js';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('ERC4626 bridge data', () => {
  let erc4626Contract: Mockify<IERC4626>;
  let erc2MetadataContract: Mockify<IERC20Metadata>;

  let provider: JsonRpcProvider;

  let mplAsset: AztecAsset;
  let xmplAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    mplAsset = {
      id: 10, // Asset has not yet been registered on RollupProcessor so this id is random
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x33349B282065b0284d756F0577FB39c158F935e6'),
    };
    xmplAsset = {
      id: 1,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x4937A209D4cDbD3ecD48857277cfd4dA4D82914c'),
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly fetch auxData when issuing shares', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      asset: jest.fn().mockReturnValue(mplAsset.erc20Address.toString()),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);

    // Test the code using mocked controller
    const auxDataIssue = await erc4626BridgeData.getAuxData(mplAsset, emptyAsset, xmplAsset, emptyAsset);
    expect(auxDataIssue[0]).toBe(0n);
  });

  it('should correctly fetch auxData when redeeming shares', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      asset: jest.fn().mockReturnValue(mplAsset.erc20Address.toString()),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);

    // Test the code using mocked controller
    const auxDataRedeem = await erc4626BridgeData.getAuxData(xmplAsset, emptyAsset, mplAsset, emptyAsset);
    expect(auxDataRedeem[0]).toBe(1n);
  });

  it('should correctly compute expected output when issuing shares', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      previewDeposit: jest.fn().mockReturnValue(BigNumber.from('111111')),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);

    // Test the code using mocked controller
    const expectedOutput = (
      await erc4626BridgeData.getExpectedOutput(mplAsset, emptyAsset, xmplAsset, emptyAsset, 0n, 10n ** 18n)
    )[0];
    expect(expectedOutput).toBe(111111n);
  });

  it('should correctly compute expected output when redeeming shares', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      previewRedeem: jest.fn().mockReturnValue(BigNumber.from('111111')),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);

    // Test the code using mocked controller
    const expectedOutput = (
      await erc4626BridgeData.getExpectedOutput(xmplAsset, emptyAsset, mplAsset, emptyAsset, 1n, 10n ** 18n)
    )[0];
    expect(expectedOutput).toBe(111111n);
  });

  it('should correctly get asset', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      asset: jest.fn().mockReturnValue(mplAsset.erc20Address.toString()),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);

    // Test the code using mocked controller
    const asset = await erc4626BridgeData.getAsset(xmplAsset.erc20Address);
    expect(asset.toString()).toBe(mplAsset.erc20Address.toString());
  });

  it('should correctly return underlying asset', async () => {
    // Setup mocks
    erc4626Contract = {
      ...erc4626Contract,
      asset: jest.fn().mockReturnValue(mplAsset.erc20Address.toString()),
      previewRedeem: jest.fn(() => BigNumber.from('100')),
    };
    IERC4626__factory.connect = () => erc4626Contract as any;

    erc2MetadataContract = {
      ...erc2MetadataContract,
      name: jest.fn().mockReturnValue('Maple Token'),
      symbol: jest.fn().mockReturnValue('MPL'),
      decimals: jest.fn().mockReturnValue(18),
    };
    IERC20Metadata__factory.connect = () => erc2MetadataContract as any;

    const erc4626BridgeData = ERC4626BridgeData.create(provider);
    const underlyingAsset = await erc4626BridgeData.getUnderlyingAmount(xmplAsset, 10n ** 18n);

    expect(underlyingAsset.address.toString()).toBe(mplAsset.erc20Address.toString());
    expect(underlyingAsset.name).toBe('Maple Token');
    expect(underlyingAsset.symbol).toBe('MPL');
    expect(underlyingAsset.decimals).toBe(18);
    expect(underlyingAsset.amount).toBe(100n);
  });
});

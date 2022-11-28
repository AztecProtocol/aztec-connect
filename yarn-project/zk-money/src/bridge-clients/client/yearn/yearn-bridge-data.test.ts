import { BigNumber } from 'ethers';
import {
  IERC20Metadata,
  IERC20Metadata__factory,
  IRollupProcessor,
  IRollupProcessor__factory,
  IYearnRegistry,
  IYearnRegistry__factory,
  IYearnVault,
  IYearnVault__factory,
} from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { YearnBridgeData } from './yearn-bridge-data.js';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('Testing Yearn auxData', () => {
  let registryContract: Mockify<IYearnRegistry>;
  let rollupProcessorContract: Mockify<IRollupProcessor>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let wethAsset: AztecAsset;
  let yvEthAsset: AztecAsset;
  let daiAsset: AztecAsset;
  let yvDaiAsset: AztecAsset;
  let yvUSDCAsset: AztecAsset;
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
    yvDaiAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    };
    yvEthAsset = {
      id: 3,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xa258c4606ca8206d8aa700ce2143d7db854d168c'),
    };
    wethAsset = {
      id: 4,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
    };
    yvUSDCAsset = {
      id: 5,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE'),
    };
    emptyAsset = {
      id: 100,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly fetch auxData for deposit', async () => {
    // Setup mocks
    const vaults = [yvDaiAsset.erc20Address.toString(), yvEthAsset.erc20Address.toString()];
    const underlying = [daiAsset.erc20Address.toString(), wethAsset.erc20Address.toString()];
    registryContract = {
      ...registryContract,
      numTokens: jest.fn(() => underlying.length),
      tokens: jest.fn((index: number) => underlying[index]),
      latestVault: jest.fn((tokenAddress: string) => {
        const indexOfToken = underlying.indexOf(tokenAddress);
        if (indexOfToken === -1) {
          throw new Error('Token not found');
        }
        return vaults[indexOfToken];
      }),
    };
    IYearnRegistry__factory.connect = () => registryContract as any;

    rollupProcessorContract = {
      ...rollupProcessorContract,
      getSupportedAsset: jest.fn((id: number) => {
        if (id === 1) {
          return daiAsset.erc20Address.toString();
        } else if (id === 2) {
          return yvDaiAsset.erc20Address.toString();
        } else if (id === 3) {
          return yvEthAsset.erc20Address.toString();
        } else if (id === 4) {
          return wethAsset.erc20Address.toString();
        }
      }),
    };
    IRollupProcessor__factory.connect = () => rollupProcessorContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());
    const auxDataDepositERC20 = await yearnBridgeData.getAuxData(daiAsset, emptyAsset, yvDaiAsset, emptyAsset);
    expect(auxDataDepositERC20[0]).toBe(0n);
    const auxDataDepositETH = await yearnBridgeData.getAuxData(ethAsset, emptyAsset, yvEthAsset, emptyAsset);
    expect(auxDataDepositETH[0]).toBe(0n);
  });

  it('should correctly fetch auxData for withdrawal', async () => {
    // Setup mocks
    const vaults = [yvDaiAsset.erc20Address.toString(), yvEthAsset.erc20Address.toString()];
    const underlying = [daiAsset.erc20Address.toString(), wethAsset.erc20Address.toString()];
    registryContract = {
      ...registryContract,
      numTokens: jest.fn(() => underlying.length),
      tokens: jest.fn((index: number) => underlying[index]),
      latestVault: jest.fn((tokenAddress: string) => {
        const indexOfToken = underlying.indexOf(tokenAddress);
        if (indexOfToken === -1) {
          throw new Error('Token not found');
        }
        return vaults[indexOfToken];
      }),
    };
    IYearnRegistry__factory.connect = () => registryContract as any;

    rollupProcessorContract = {
      ...rollupProcessorContract,
      getSupportedAsset: jest.fn((id: number) => {
        if (id === 1) {
          return daiAsset.erc20Address.toString();
        } else if (id === 2) {
          return yvDaiAsset.erc20Address.toString();
        } else if (id === 3) {
          return yvEthAsset.erc20Address.toString();
        } else if (id === 4) {
          return wethAsset.erc20Address.toString();
        }
      }),
    };
    IRollupProcessor__factory.connect = () => rollupProcessorContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());
    const auxDataDepositERC20 = await yearnBridgeData.getAuxData(yvDaiAsset, emptyAsset, daiAsset, emptyAsset);
    expect(auxDataDepositERC20[0]).toBe(1n);
    const auxDataDepositETH = await yearnBridgeData.getAuxData(yvEthAsset, emptyAsset, ethAsset, emptyAsset);
    expect(auxDataDepositETH[0]).toBe(1n);
  });

  it('should throw when getting auxData for unsupported inputAssetA', async () => {
    // Setup mocks
    const vaults = [yvDaiAsset.erc20Address.toString(), yvEthAsset.erc20Address.toString()];
    const underlying = [daiAsset.erc20Address.toString(), wethAsset.erc20Address.toString()];
    registryContract = {
      ...registryContract,
      numTokens: jest.fn(() => underlying.length),
      tokens: jest.fn((index: number) => underlying[index]),
      latestVault: jest.fn((tokenAddress: string) => {
        const indexOfToken = underlying.indexOf(tokenAddress);
        if (indexOfToken === -1) {
          throw new Error('Token not found');
        }
        return vaults[indexOfToken];
      }),
    };
    IYearnRegistry__factory.connect = () => registryContract as any;

    rollupProcessorContract = {
      ...rollupProcessorContract,
      getSupportedAsset: jest.fn().mockReturnValue(EthAddress.random().toString()),
    };
    IRollupProcessor__factory.connect = () => rollupProcessorContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    expect.assertions(1);
    await expect(yearnBridgeData.getAuxData(yvDaiAsset, emptyAsset, ethAsset, emptyAsset)).rejects.toEqual(
      new Error('inputAssetA not supported'),
    );
  });

  it('should throw when getting auxData for unsupported outputAssetA', async () => {
    // Setup mocks
    const vaults = [yvDaiAsset.erc20Address.toString(), yvEthAsset.erc20Address.toString()];
    const underlying = [daiAsset.erc20Address.toString(), wethAsset.erc20Address.toString()];
    registryContract = {
      ...registryContract,
      numTokens: jest.fn(() => underlying.length),
      tokens: jest.fn((index: number) => underlying[index]),
      latestVault: jest.fn((tokenAddress: string) => {
        const indexOfToken = underlying.indexOf(tokenAddress);
        if (indexOfToken === -1) {
          throw new Error('Token not found');
        }
        return vaults[indexOfToken];
      }),
    };
    IYearnRegistry__factory.connect = () => registryContract as any;

    rollupProcessorContract = {
      ...rollupProcessorContract,
      getSupportedAsset: jest.fn().mockReturnValue(EthAddress.random().toString()),
    };
    IRollupProcessor__factory.connect = () => rollupProcessorContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    expect.assertions(1);
    await expect(yearnBridgeData.getAuxData(ethAsset, emptyAsset, yvEthAsset, emptyAsset)).rejects.toEqual(
      new Error('outputAssetA not supported'),
    );
  });

  it('should throw when getting incompatible assets', async () => {
    // Setup mocks
    const vaults = [yvDaiAsset.erc20Address.toString(), yvEthAsset.erc20Address.toString()];
    const underlying = [daiAsset.erc20Address.toString(), wethAsset.erc20Address.toString()];
    registryContract = {
      ...registryContract,
      numTokens: jest.fn(() => underlying.length),
      tokens: jest.fn((index: number) => underlying[index]),
      latestVault: jest.fn((tokenAddress: string) => {
        const indexOfToken = underlying.indexOf(tokenAddress);
        if (indexOfToken === -1) {
          throw new Error('Token not found');
        }
        return vaults[indexOfToken];
      }),
    };
    IYearnRegistry__factory.connect = () => registryContract as any;

    rollupProcessorContract = {
      ...rollupProcessorContract,
      getSupportedAsset: jest.fn((id: number) => {
        if (id === 1) {
          return daiAsset.erc20Address.toString();
        } else if (id === 2) {
          return yvDaiAsset.erc20Address.toString();
        } else if (id === 3) {
          return yvEthAsset.erc20Address.toString();
        } else if (id === 4) {
          return wethAsset.erc20Address.toString();
        } else if (id === 5) {
          return yvUSDCAsset.erc20Address.toString();
        }
      }),
    };
    IRollupProcessor__factory.connect = () => rollupProcessorContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    expect.assertions(8);
    await expect(yearnBridgeData.getAuxData(ethAsset, emptyAsset, yvDaiAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(daiAsset, emptyAsset, yvEthAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(daiAsset, emptyAsset, ethAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(daiAsset, emptyAsset, yvUSDCAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(yvDaiAsset, emptyAsset, ethAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(yvEthAsset, emptyAsset, daiAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(ethAsset, emptyAsset, daiAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
    await expect(yearnBridgeData.getAuxData(yvUSDCAsset, emptyAsset, daiAsset, emptyAsset)).rejects.toEqual(
      new Error('Invalid input and/or output asset'),
    );
  });
});

describe('Testing Yearn expectedOutput', () => {
  let vaultContract: Mockify<IYearnVault>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let yvEthAsset: AztecAsset;
  let daiAsset: AztecAsset;
  let yvDaiAsset: AztecAsset;
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
    yvDaiAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    };
    yvEthAsset = {
      id: 3,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xa258c4606ca8206d8aa700ce2143d7db854d168c'),
    };
    emptyAsset = {
      id: 100,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly get expectedOutput for deposit', async () => {
    // Setup mocks
    vaultContract = {
      ...vaultContract,
      pricePerShare: jest.fn(() => BigNumber.from('1010200000000000000')),
      decimals: jest.fn(() => BigNumber.from('18')),
    };
    IYearnVault__factory.connect = () => vaultContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    const expectedOutputERC20 = await yearnBridgeData.getExpectedOutput(
      daiAsset,
      emptyAsset,
      yvDaiAsset,
      emptyAsset,
      0n,
      10n ** 18n,
    );
    expect(expectedOutputERC20[0]).toBe(989902989507028311n);
    expect(expectedOutputERC20[1]).toBe(0n);

    const expectedOutputETH = await yearnBridgeData.getExpectedOutput(
      ethAsset,
      emptyAsset,
      yvEthAsset,
      emptyAsset,
      0n,
      10n ** 18n,
    );
    expect(expectedOutputETH[0]).toBe(989902989507028311n);
    expect(expectedOutputETH[1]).toBe(0n);
  });

  it('should correctly get expectedOutput for withdrawal', async () => {
    // Setup mocks
    vaultContract = {
      ...vaultContract,
      pricePerShare: jest.fn(() => BigNumber.from('1110200000000000000')),
      decimals: jest.fn(() => BigNumber.from('18')),
    };
    IYearnVault__factory.connect = () => vaultContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    const expectedOutputERC20 = await yearnBridgeData.getExpectedOutput(
      yvDaiAsset,
      emptyAsset,
      daiAsset,
      emptyAsset,
      1n,
      10n ** 18n,
    );
    expect(expectedOutputERC20[0]).toBe(1110200000000000000n);
    expect(expectedOutputERC20[1]).toBe(0n);

    const expectedOutputETH = await yearnBridgeData.getExpectedOutput(
      yvEthAsset,
      emptyAsset,
      ethAsset,
      emptyAsset,
      1n,
      10n ** 18n,
    );
    expect(expectedOutputETH[0]).toBe(1110200000000000000n);
    expect(expectedOutputETH[1]).toBe(0n);
  });

  it('should throw when getting incompatible auxData', async () => {
    // Setup mocks
    vaultContract = {
      ...vaultContract,
      pricePerShare: jest.fn(() => BigNumber.from('1110200000000000000')),
      decimals: jest.fn(() => BigNumber.from('18')),
    };
    IYearnVault__factory.connect = () => vaultContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    expect.assertions(3);
    await expect(
      yearnBridgeData.getExpectedOutput(yvDaiAsset, emptyAsset, daiAsset, emptyAsset, 0n, 10n ** 18n),
    ).rejects.toEqual(new Error('Token not found'));
    await expect(
      yearnBridgeData.getExpectedOutput(daiAsset, emptyAsset, yvDaiAsset, emptyAsset, 1n, 10n ** 18n),
    ).rejects.toEqual(new Error('Token not found'));
    await expect(
      yearnBridgeData.getExpectedOutput(yvDaiAsset, emptyAsset, daiAsset, emptyAsset, 3n, 10n ** 18n),
    ).rejects.toEqual(new Error('Invalid auxData'));
  });

  it('should throw with incorrect tokens on the input', async () => {
    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());

    await expect(
      yearnBridgeData.getExpectedOutput(emptyAsset, emptyAsset, emptyAsset, emptyAsset, 0n, 0n),
    ).rejects.toEqual(new Error('Token not found'));
    await expect(
      yearnBridgeData.getExpectedOutput(yvDaiAsset, emptyAsset, emptyAsset, emptyAsset, 0n, 0n),
    ).rejects.toEqual(new Error('Token not found'));
  });
});

describe('Testing Yearn getAPR', () => {
  let provider: JsonRpcProvider;

  let yvDaiAsset: AztecAsset;
  let yvWethAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    yvDaiAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    };
    yvWethAsset = {
      id: 3,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xa258c4606ca8206d8aa700ce2143d7db854d168c'),
    };
  });

  it('should correctly compute APR', async () => {
    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());
    const expectedAPRDai = await yearnBridgeData.getAPR(yvDaiAsset);
    expect(expectedAPRDai).not.toBeUndefined();
    expect(expectedAPRDai).toBeGreaterThan(0);

    const expectedAPRWeth = await yearnBridgeData.getAPR(yvWethAsset);
    expect(expectedAPRWeth).not.toBeUndefined();
    expect(expectedAPRWeth).toBeGreaterThan(0);
  });
});

describe('Testing Yearn getMarketSize', () => {
  let vaultContract: Mockify<IYearnVault>;

  let provider: JsonRpcProvider;

  let daiAsset: AztecAsset;
  let yvDaiAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    daiAsset = {
      id: 1,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
    };
    yvDaiAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    };
    emptyAsset = {
      id: 100,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
  });

  it('should correctly compute total assets', async () => {
    // Setup mocks
    vaultContract = {
      ...vaultContract,
      totalAssets: jest.fn().mockReturnValue(BigNumber.from('97513214188808613008055674')),
    };
    IYearnVault__factory.connect = () => vaultContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());
    const expectedMarketSize = (
      await yearnBridgeData.getMarketSize(daiAsset, emptyAsset, yvDaiAsset, emptyAsset, 0n)
    )[0].value;
    expect(expectedMarketSize).toBe(97513214188808613008055674n);
  });
});

describe('Testing Yearn getUnderlyingAmount', () => {
  let vaultContract: Mockify<IYearnVault>;
  let erc2MetadataContract: Mockify<IERC20Metadata>;

  let provider: JsonRpcProvider;

  let yvDaiAsset: AztecAsset;

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    yvDaiAsset = {
      id: 2,
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString('0xdA816459F1AB5631232FE5e97a05BBBb94970c95'),
    };
  });

  it('should correctly return underlying asset', async () => {
    // Setup mocks
    vaultContract = {
      ...vaultContract,
      token: jest.fn().mockReturnValue('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
      pricePerShare: jest.fn(() => BigNumber.from('1110200000000000000')),
      decimals: jest.fn(() => 18),
    };
    IYearnVault__factory.connect = () => vaultContract as any;

    erc2MetadataContract = {
      ...erc2MetadataContract,
      name: jest.fn().mockReturnValue('Dai Stablecoin'),
      symbol: jest.fn().mockReturnValue('DAI'),
      decimals: jest.fn().mockReturnValue(18),
    };
    IERC20Metadata__factory.connect = () => erc2MetadataContract as any;

    const yearnBridgeData = YearnBridgeData.create(provider, EthAddress.random());
    const underlyingAsset = await yearnBridgeData.getUnderlyingAmount(yvDaiAsset, 10n ** 18n);

    expect(underlyingAsset.address.toString()).toBe('0x6B175474E89094C44Da98b954EedeAC495271d0F');
    expect(underlyingAsset.name).toBe('Dai Stablecoin');
    expect(underlyingAsset.symbol).toBe('DAI');
    expect(underlyingAsset.decimals).toBe(18);
    expect(underlyingAsset.amount).toBe(1110200000000000000n);
  });
});

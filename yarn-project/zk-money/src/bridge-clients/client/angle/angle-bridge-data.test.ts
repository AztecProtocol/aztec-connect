import { AngleBridgeData } from './angle-bridge-data.js';
import { IStableMaster, IStableMaster__factory } from '../../typechain-types/index.js';
import { AztecAsset, AztecAssetType } from '../bridge-data.js';
import { utils } from 'ethers';
import { jest } from '@jest/globals';
import { EthAddress, JsonRpcProvider } from '@aztec/sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock | any;
};

describe('Testing Angle Bridge', () => {
  let angleBridgeData: AngleBridgeData;
  let stableMasterContract: Mockify<IStableMaster>;

  let provider: JsonRpcProvider;

  let ethAsset: AztecAsset;
  let emptyAsset: AztecAsset;

  let DAI: AztecAsset;
  let WETH: AztecAsset;

  let sanDAI: AztecAsset;
  let sanUSDC: AztecAsset;
  let sanWETH: AztecAsset;

  const createBridgeData = (stableMaster = stableMasterContract) => {
    IStableMaster__factory.connect = () => stableMaster as any;
    return AngleBridgeData.create(provider);
  };

  beforeAll(() => {
    provider = new JsonRpcProvider('https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c');

    angleBridgeData = AngleBridgeData.create(provider);

    ethAsset = {
      id: 1,
      assetType: AztecAssetType.ETH,
      erc20Address: EthAddress.ZERO,
    };
    emptyAsset = {
      id: 0,
      assetType: AztecAssetType.NOT_USED,
      erc20Address: EthAddress.ZERO,
    };
    DAI = {
      id: Math.round(Math.random() * 1000),
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString(angleBridgeData.DAI),
    };
    WETH = {
      id: Math.round(Math.random() * 1000),
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString(angleBridgeData.WETH),
    };
    sanDAI = {
      id: Math.round(Math.random() * 1000),
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString(angleBridgeData.sanDAI),
    };
    sanUSDC = {
      id: Math.round(Math.random() * 1000),
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString(angleBridgeData.sanUSDC),
    };
    sanWETH = {
      id: Math.round(Math.random() * 1000),
      assetType: AztecAssetType.ERC20,
      erc20Address: EthAddress.fromString(angleBridgeData.sanWETH),
    };
  });

  it('should get correct auxData', async () => {
    await expect(() => angleBridgeData.getAuxData(ethAsset, emptyAsset, sanUSDC, emptyAsset)).rejects.toEqual(
      new Error('inputAssetA and outputAssetA must be ERC20'),
    );

    angleBridgeData = createBridgeData({
      collateralMap: jest.fn().mockReturnValue({ sanToken: sanDAI.erc20Address.toString().toLowerCase() }),
    } as any);
    expect(await angleBridgeData.getAuxData(sanDAI, emptyAsset, DAI, emptyAsset)).toEqual([1n]);
    expect(await angleBridgeData.getAuxData(DAI, emptyAsset, sanDAI, emptyAsset)).toEqual([0n]);

    angleBridgeData = createBridgeData({
      collateralMap: jest.fn().mockReturnValue({ sanToken: sanWETH.erc20Address.toString().toLowerCase() }),
    } as any);
    await expect(() => angleBridgeData.getAuxData(DAI, emptyAsset, sanDAI, emptyAsset)).rejects.toEqual(
      new Error('invalid outputAssetA'),
    );
    expect(await angleBridgeData.getAuxData(WETH, emptyAsset, sanWETH, emptyAsset)).toEqual([0n]);
  });

  it('should get correct output', async () => {
    angleBridgeData = createBridgeData({
      collateralMap: jest.fn().mockReturnValue({
        sanRate: utils.parseEther('1.2'),
        sanToken: sanDAI.erc20Address.toString().toLowerCase(),
      }),
    } as any);

    expect(
      await angleBridgeData.getExpectedOutput(
        DAI,
        emptyAsset,
        sanDAI,
        emptyAsset,
        0n,
        10n * angleBridgeData.scalingFactor,
      ),
    ).toEqual([8333333333333333333n]);

    await expect(() =>
      angleBridgeData.getExpectedOutput(DAI, emptyAsset, sanDAI, emptyAsset, 1n, 10n * angleBridgeData.scalingFactor),
    ).rejects.toEqual(new Error('invalid auxData'));

    expect(
      await angleBridgeData.getExpectedOutput(
        sanDAI,
        emptyAsset,
        DAI,
        emptyAsset,
        1n,
        10n * angleBridgeData.scalingFactor,
      ),
    ).toEqual([12000000000000000000n]);
  });

  it('should return correct aprs', async () => {
    const mockedData = {
      sanUSDC_EUR: {
        details: { min: 4.019568740694012, max: 10.048921851735031, fees: 1.0402, interests: 1.3301376806852165 },
        value: 6.389906421379229,
        address: '0x51fE22abAF4a26631b2913E417c0560D547797a7',
      },
      sanDAI_EUR: {
        details: { min: 3.866708718395269, max: 9.666771795988172, fees: 0.0085, interests: 0.640460751379123 },
        value: 4.515669469774393,
        address: '0x8E2c0CbDa6bA7B65dbcA333798A3949B07638026',
      },
      sanFRAX_EUR: {
        details: { min: 3.3416072117607962, max: 8.35401802940199, fees: 0, interests: 4.555772172983031 },
        value: 7.897379384743827,
        address: '0xb40432243E4F317cE287398e72Ab8f0312fc2FE8',
      },
      sanWETH_EUR: {
        details: { fees: 0.0139, interests: 1.5377080725122123 },
        value: 1.5516080725122123,
        address: '0x30c955906735e48D73080fD20CB488518A6333C8',
      },
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockedData),
      }),
    ) as any;

    expect(await angleBridgeData.getAPR(sanDAI)).toEqual(mockedData.sanDAI_EUR.value);
    expect(await angleBridgeData.getAPR(sanUSDC)).toEqual(mockedData.sanUSDC_EUR.value);
    expect(await angleBridgeData.getAPR(sanWETH)).toEqual(mockedData.sanWETH_EUR.value);
    expect(await angleBridgeData.getAPR(ethAsset)).toEqual(0);
  });
});

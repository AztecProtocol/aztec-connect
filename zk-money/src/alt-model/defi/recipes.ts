import createDebug from 'debug';
import { EthAddress } from '@aztec/sdk';
import { DefiInvestmentType, DefiRecipe, KeyBridgeStat } from './types';
import lidoLogo from '../../images/lido_white.svg';
import lidoMiniLogo from '../../images/lido_mini_logo.png';
import elementFiLogo from '../../images/element_fi_logo.svg';
import elementMiniLogo from '../../images/element_mini_logo.png';
import aaveLogo from '../../images/aave_logo_white.svg';
import aaveMiniLogo from '../../images/aave_mini_logo.png';
import ethToDaiBanner from '../../images/eth_to_dai_banner.svg';
import { createMockYieldAdaptor } from './bridge_data_adaptors/adaptor_mock';
import { createElementAdaptor } from './bridge_data_adaptors/element_adaptor';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { RemoteAsset } from 'alt-model/types';
import { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';

const debug = createDebug('zm:recipes');

interface CreateRecipeArgs extends Omit<DefiRecipe, 'closable' | 'inputAssetA' | 'outputAssetA'> {
  isAsync?: boolean;
  addressId: number;
  inputAssetAddressA: EthAddress;
  outputAssetAddressA: EthAddress;
}

function createRecipe(
  { isAsync, inputAssetAddressA, outputAssetAddressA, ...args }: CreateRecipeArgs,
  assets: RemoteAsset[],
): DefiRecipe | undefined {
  const closable = !!isAsync;
  const inputAssetA = assets.find(x => x.address.equals(inputAssetAddressA));
  const outputAssetA = assets.find(x => x.address.equals(outputAssetAddressA));
  if (!inputAssetA || !outputAssetA) {
    debug(`Could not find remote assets for recipe '${args.id}'`);
    return;
  }
  return { ...args, closable, inputAssetA, outputAssetA };
}

// const ETH = 0;
const DAI = 1;
// const zkwStETH = 3;
// const TO_BE_CONFIRMED = 0;
// const NOT_USED = 0;

const CREATE_RECIPES_ARGS: CreateRecipeArgs[] = [
  {
    id: 'element-finance.DAI-to-DAI',
    openHandleAssetId: DAI,
    isAsync: true,
    addressId: 2,
    inputAssetAddressA: KMAA.DAI,
    outputAssetAddressA: KMAA.DAI,
    createAdaptor: createElementAdaptor,
    name: 'Element Fixed Yield',
    investmentType: DefiInvestmentType.FIXED_YIELD,
    shortDesc: 'Deposit zkDAI into Element and receive a fixed yield back in xx Days as zkDAI',
    longDescription:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: elementFiLogo,
    miniLogo: elementMiniLogo,
    keyStat1: KeyBridgeStat.FIXED_YIELD,
    keyStat2: KeyBridgeStat.BATCH_SIZE,
    keyStat3: KeyBridgeStat.MATURITY,
  },
  {
    id: 'fake-lido-finance.ETH-to-wStETH',
    openHandleAssetId: DAI,
    addressId: 1,
    inputAssetAddressA: KMAA.ETH,
    outputAssetAddressA: KMAA.ETH,
    createAdaptor: createMockYieldAdaptor,
    name: 'Lido Staking',
    investmentType: DefiInvestmentType.STAKING,
    shortDesc:
      'Stake zkETH on the Beacon chain via Lido. Receive a variable yield via the zkwStETH tokens that can be claimed for zkETH',
    longDescription:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: lidoLogo,
    miniLogo: lidoMiniLogo,
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
  },
  {
    id: 'fake-aave-lending.DAI-to-aDAI',
    openHandleAssetId: DAI,
    addressId: 1,
    inputAssetAddressA: KMAA.ETH,
    outputAssetAddressA: KMAA.DAI,
    createAdaptor: createMockYieldAdaptor,
    name: 'AAVE Lending',
    investmentType: DefiInvestmentType.YIELD,
    shortDesc: 'Deposit zkDAI into AAVE receive zkADAI in return.',
    longDescription:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: aaveLogo,
    miniLogo: aaveMiniLogo,
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
  },
];

export function createDefiRecipeObs(knownAssetsObs: RemoteAssetsObs) {
  return knownAssetsObs.map(assets => {
    if (!assets) return undefined;
    const recipes: DefiRecipe[] = [];
    for (const args of CREATE_RECIPES_ARGS) {
      const recipe = createRecipe(args, assets);
      if (recipe) recipes.push(recipe);
    }
    return recipes;
  });
}

export type DefiRecipesObs = ReturnType<typeof createDefiRecipeObs>;

import createDebug from 'debug';
import { EthAddress, RollupProviderStatus } from '@aztec/sdk';
import { BridgeFlowAssets, DefiInvestmentType, DefiRecipe, KeyBridgeStat } from './types';
import lidoLogo from '../../images/lido_white.svg';
import lidoMiniLogo from '../../images/lido_mini_logo.png';
import elementFiLogo from '../../images/element_fi_logo.svg';
import elementMiniLogo from '../../images/element_mini_logo.png';
import ethToDaiBanner from '../../images/eth_to_dai_banner.svg';
import { createElementAdaptor } from './bridge_data_adaptors/element_adaptor';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { RemoteAsset } from 'alt-model/types';
import { RemoteAssetsObs } from 'alt-model/top_level_context/remote_assets_obs';
import { createLidoAdaptor } from './bridge_data_adaptors/lido_adaptor';
import { RemoteStatusObs } from 'alt-model/top_level_context/remote_status_poller';
import { Obs } from 'app/util';

const debug = createDebug('zm:recipes');

interface CreateRecipeArgs extends Omit<DefiRecipe, 'address' | 'flow' | 'valueEstimationInteractionAssets'> {
  isAsync?: boolean;
  entryInputAssetAddressA: EthAddress;
  entryOutputAssetAddressA: EthAddress;
  openHandleAssetAddress?: EthAddress;
}

function createRecipe(
  { isAsync, entryInputAssetAddressA, entryOutputAssetAddressA, openHandleAssetAddress, ...args }: CreateRecipeArgs,
  status: RollupProviderStatus,
  assets: RemoteAsset[],
): DefiRecipe | undefined {
  const closable = !isAsync;
  const expectedYearlyOutDerivedFromExit = closable;
  const address = status.blockchainStatus.bridges.find(x => x.id === args.addressId)?.address;
  if (!address) {
    debug(`Could not find remote bridge for recipe '${args.id}'`);
    return;
  }
  const entryInputAssetA = assets.find(x => x.address.equals(entryInputAssetAddressA));
  const entryOutputAssetA = assets.find(x => x.address.equals(entryOutputAssetAddressA));
  if (!entryInputAssetA || !entryOutputAssetA) {
    debug(`Could not find remote assets for recipe '${args.id}'`);
    return;
  }
  const enter = { inA: entryInputAssetA, outA: entryOutputAssetA };
  const exit = { inA: entryOutputAssetA, outA: entryInputAssetA };
  const flow: BridgeFlowAssets = closable ? { type: 'closable', enter, exit } : { type: 'async', enter };
  const valueEstimationInteractionAssets = expectedYearlyOutDerivedFromExit ? exit : enter;
  let openHandleAsset: RemoteAsset | undefined = undefined;
  if (openHandleAssetAddress) {
    openHandleAsset = assets.find(x => x.address.equals(openHandleAssetAddress));
    if (!openHandleAsset) {
      debug(`Could not find open handle asset for recipe '${args.id}'`);
      return;
    }
  }
  return { ...args, address, flow, openHandleAsset, valueEstimationInteractionAssets };
}

const CREATE_RECIPES_ARGS: CreateRecipeArgs[] = [
  {
    id: 'element-finance.DAI-to-DAI',
    isAsync: true,
    addressId: 2,
    entryInputAssetAddressA: KMAA.DAI,
    entryOutputAssetAddressA: KMAA.DAI,
    createAdaptor: createElementAdaptor,
    projectName: 'Element',
    website: 'https://element.fi/',
    websiteLabel: 'element.fi',
    name: 'Element Fixed Yield',
    investmentType: DefiInvestmentType.FIXED_YIELD,
    shortDesc:
      'Deposit zkDai to Element for fixed yield. Funds are locked in Element and returned at the maturity date.',
    longDescription:
      'Element allows you to invest assets for a fixed yield. Deposit an asset today and receive it back on the maturity date with a fixed APR.',
    bannerImg: ethToDaiBanner,
    logo: elementFiLogo,
    miniLogo: elementMiniLogo,
    roiType: 'APR',
    keyStat1: KeyBridgeStat.FIXED_YIELD,
    keyStat2: KeyBridgeStat.MATURITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
  },
  {
    id: 'lido-finance.ETH-to-wStETH',
    addressId: 3,
    openHandleAssetAddress: KMAA.wstETH,
    entryInputAssetAddressA: KMAA.ETH,
    entryOutputAssetAddressA: KMAA.wstETH,
    createAdaptor: createLidoAdaptor,
    projectName: 'Lido',
    website: 'https://lido.fi/',
    websiteLabel: 'lido.fi',
    name: 'Lido Staking',
    investmentType: DefiInvestmentType.STAKING,
    shortDesc: 'Stake zkETH with Lido to earn daily rewards.',
    longDescription:
      'This bridge, lets you invest DAI into AAVE and receive interest bearing aDAI in return. Also receive AAVE liquidity mining rewards. Gas savings are 30x and privacy is the default.',
    bannerImg: ethToDaiBanner,
    logo: lidoLogo,
    miniLogo: lidoMiniLogo,
    roiType: 'APR',
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
  },
];

export function createDefiRecipeObs(remoteStatusObs: RemoteStatusObs, remoteAssetsObs: RemoteAssetsObs) {
  return Obs.combine([remoteStatusObs, remoteAssetsObs]).map(([status, assets]) => {
    if (!status || !assets) return undefined;
    const recipes: DefiRecipe[] = [];
    for (const args of CREATE_RECIPES_ARGS) {
      const recipe = createRecipe(args, status, assets);
      if (recipe) recipes.push(recipe);
    }
    return recipes;
  });
}

export type DefiRecipesObs = ReturnType<typeof createDefiRecipeObs>;

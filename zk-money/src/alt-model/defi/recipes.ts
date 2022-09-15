import createDebug from 'debug';
import { BlockchainBridge, BlockchainStatus, EthAddress, RollupProviderStatus } from '@aztec/sdk';
import { BridgeFlowAssets, DefiInvestmentType, DefiRecipe, KeyBridgeStat } from './types';
import lidoXCurveLogo from 'images/lido_x_curve_logo.svg';
import lidoMiniLogo from 'images/lido_mini_logo.png';
import elementFiLogo from 'images/element_fi_logo.svg';
import yearnLogo from 'images/yearn_logo.svg';
import yearnGradientLogo from 'images/yearn_gradient.svg';
import elementMiniLogo from 'images/element_mini_logo.png';
import ethToDaiBanner from 'images/eth_to_dai_banner.svg';
import { createElementAdaptor } from './bridge_data_adaptors/element_adaptor';
import { createYearnAdaptor } from './bridge_data_adaptors/yearn_adaptor';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { RemoteAsset } from 'alt-model/types';
import { createLidoAdaptor } from './bridge_data_adaptors/lido_adaptor';

const debug = createDebug('zm:recipes');

interface CreateRecipeArgs
  extends Omit<DefiRecipe, 'bridgeAddressId' | 'address' | 'flow' | 'valueEstimationInteractionAssets'> {
  selectBlockchainBridge: (blockchainStatus: BlockchainStatus) => BlockchainBridge | undefined;
  selectExitBlockchainBridge?: (blockchainStatus: BlockchainStatus) => BlockchainBridge | undefined;
  isAsync?: boolean;
  entryInputAssetAddressA: EthAddress;
  entryOutputAssetAddressA: EthAddress;
  openHandleAssetAddress?: EthAddress;
}

function createRecipe(
  {
    isAsync,
    entryInputAssetAddressA,
    entryOutputAssetAddressA,
    openHandleAssetAddress,
    selectBlockchainBridge,
    selectExitBlockchainBridge,
    ...args
  }: CreateRecipeArgs,
  status: RollupProviderStatus,
  assets: RemoteAsset[],
): DefiRecipe | undefined {
  const closable = !isAsync;
  const expectedYearlyOutDerivedFromExit = closable;
  const blockchainBridge = selectBlockchainBridge(status.blockchainStatus);
  if (!blockchainBridge) {
    debug(`Could not find remote bridge for recipe '${args.id}'`);
    return;
  }
  const bridgeAddressId = blockchainBridge.id;
  const address = blockchainBridge.address;
  const exitBlockchainBridge = selectExitBlockchainBridge?.(status.blockchainStatus);
  if (selectExitBlockchainBridge && !exitBlockchainBridge) {
    debug(`Could not find remote bridge for exiting on recipe '${args.id}'`);
    return;
  }
  const exitBridgeAddressId = exitBlockchainBridge?.id;
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
  return {
    ...args,
    isAsync,
    bridgeAddressId,
    exitBridgeAddressId,
    address,
    flow,
    openHandleAsset,
    valueEstimationInteractionAssets,
  };
}

const CREATE_RECIPES_ARGS: CreateRecipeArgs[] = [
  {
    id: 'element-finance-old.DAI-to-DAI',
    unlisted: true,
    isAsync: true,
    selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 1),
    entryInputAssetAddressA: KMAA.DAI,
    entryOutputAssetAddressA: KMAA.DAI,
    createAdaptor: createElementAdaptor,
    enterAuxDataResolver: {
      type: 'bridge-data-select',
      selectOpt: opts => opts[0], // Tranche expiry timestamp
    },
    projectName: 'Element',
    gradient: ['#2E69C3', '#6ACDE2'],
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
    keyStat3: KeyBridgeStat.NEXT_BATCH,
  },
  {
    id: 'element-finance.DAI-to-DAI',
    isAsync: true,
    selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 9),
    entryInputAssetAddressA: KMAA.DAI,
    entryOutputAssetAddressA: KMAA.DAI,
    createAdaptor: createElementAdaptor,
    enterAuxDataResolver: {
      type: 'bridge-data-select',
      selectOpt: opts => opts[opts.length - 1], // Tranche expiry timestamp
    },
    projectName: 'Element',
    gradient: ['#2E69C3', '#6ACDE2'],
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
    keyStat3: KeyBridgeStat.NEXT_BATCH,
  },
  {
    id: 'lido-staking-x-curve.ETH-to-wStETH',
    selectBlockchainBridge: ({ bridges, chainId }) => {
      switch (chainId) {
        case 1:
          return bridges.find(x => x.id === 6);
        case 0xa57ec:
          // TODO: check aztec-connect-dev deployment settles on this id
          return bridges.find(x => x.id === 6);
      }
    },
    gradient: ['#E97B61', '#F5CB85'],
    openHandleAssetAddress: KMAA.wstETH,
    entryInputAssetAddressA: KMAA.ETH,
    entryOutputAssetAddressA: KMAA.wstETH,
    createAdaptor: createLidoAdaptor,
    enterAuxDataResolver: {
      type: 'static',
      value: 1e18, // Minimum acceptable amount of stEth per 1 eth
    },
    exitAuxDataResolver: {
      type: 'static',
      value: 0.9e18, // Minimum acceptable amount of eth per 1 stEth
    },
    projectName: 'Lido',
    website: 'https://lido.fi/',
    websiteLabel: 'lido.fi',
    name: 'Lido Staking × Curve',
    investmentType: DefiInvestmentType.STAKING,
    shortDesc: 'Swap ETH for stETH on Curve and earn daily staking rewards. stETH is wrapped into wstETH.',
    exitDesc: 'Unwrap zkwstETH and swap on Curve to get back zkETH.',
    longDescription:
      'Swap ETH for liquid staked ETH (stETH) on Curve and earn daily staking rewards. stETH is wrapped into wstETH, allowing you to earn staking yields without locking assets.',
    bannerImg: ethToDaiBanner,
    logo: lidoXCurveLogo,
    miniLogo: lidoMiniLogo,
    roiType: 'APR',
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.NEXT_BATCH,
  },
  {
    id: 'yearn-finance.ETH-to-yvETH',
    openHandleAssetAddress: KMAA.yvETH,
    entryInputAssetAddressA: KMAA.ETH,
    entryOutputAssetAddressA: KMAA.yvETH,
    createAdaptor: createYearnAdaptor,
    projectName: 'Yearn Finance',
    gradient: ['#0040C2', '#A1B6E0'],
    website: 'https://yearn.finance/',
    websiteLabel: 'yearn.finance',
    name: 'Yearn Finance',
    investmentType: DefiInvestmentType.YIELD,
    shortDesc: `Deposit ETH into Yearn's vault to easily generate yield with a passive investing strategy.`,
    longDescription:
      'Depositing into the Yearn vault, pools the capital and uses the Yearn strategies to automate yield generation and rebalancing. Your position is represented with yvETH.',
    bannerImg: yearnLogo,
    logo: yearnLogo,
    miniLogo: yearnGradientLogo,
    roiType: 'APY',
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.NEXT_BATCH,
    selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 7),
    selectExitBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 8),
    enterAuxDataResolver: { type: 'static', value: 0 },
    exitAuxDataResolver: { type: 'static', value: 1 },
  },
  {
    id: 'yearn-finance.DAI-to-yvDAI',
    openHandleAssetAddress: KMAA.yvDAI,
    entryInputAssetAddressA: KMAA.DAI,
    entryOutputAssetAddressA: KMAA.yvDAI,
    createAdaptor: createYearnAdaptor,
    projectName: 'Yearn Finance',
    gradient: ['#0040C2', '#A1B6E0'],
    website: 'https://yearn.finance/',
    websiteLabel: 'yearn.finance',
    name: 'Yearn Finance',
    investmentType: DefiInvestmentType.YIELD,
    shortDesc: `Deposit DAI into Yearn's vault to easily generate yield with a passive investing strategy.`,
    longDescription:
      'Depositing into the Yearn vault, pools the capital and uses the Yearn strategies to automate yield generation and rebalancing. Your position is represented with yvDAI.',
    bannerImg: yearnLogo,
    logo: yearnLogo,
    miniLogo: yearnGradientLogo,
    roiType: 'APY',
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.NEXT_BATCH,
    hideUnderlyingOnExit: true,
    selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 7),
    selectExitBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 8),
    enterAuxDataResolver: { type: 'static', value: 0 },
    exitAuxDataResolver: { type: 'static', value: 1 },
  },
];

export function createDefiRecipes(status: RollupProviderStatus, assets: RemoteAsset[]) {
  const recipes: DefiRecipe[] = [];
  for (const args of CREATE_RECIPES_ARGS) {
    const recipe = createRecipe(args, status, assets);
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}

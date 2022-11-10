import aaveLogo from '../../../images/aave_logo_white.svg';
import aaveMiniLogo from '../../../images/aave_mini_logo.png';
import ethToDaiBanner from '../../../images/eth_to_dai_banner.svg';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from '../../../alt-model/known_assets/known_asset_addresses.js';
import { AaveV2BridgeData } from '@aztec/bridge-clients/client-dest/src/client/aavev2/aavev2-bridge-data.js';
import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultLiquidity } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';

export const AAVE_ETH_CARD: CreateRecipeArgs = {
  id: 'aave.ETH-to-wa2ETH',
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 13),
  gradient: ['#9b559c', '#9b559c'],
  openHandleAssetAddress: KMAA.wa2WETH,
  entryInputAssetAddressA: KMAA.ETH,
  entryOutputAssetAddressA: KMAA.wa2WETH,
  createAdaptor: provider => AaveV2BridgeData.create(provider),
  enterAuxDataResolver: {
    type: 'static',
    value: 0, // Deposit flow
  },
  exitAuxDataResolver: {
    type: 'static',
    value: 1, // Exit flow
  },
  projectName: 'Aave',
  website: 'https://www.aave.com/',
  websiteLabel: 'aave.com',
  name: 'Aave',
  shortDesc: 'Lend ETH on Aave and earn yield by holding wa2WETH in exchange.',
  exitDesc: 'Unwrap wa2WETH to recieve your underlying ETH.',
  longDescription: 'Lend ETH on Aave and earn yield by holding wa2WETH in exchange.',
  bannerImg: ethToDaiBanner,
  logo: aaveLogo,
  miniLogo: aaveMiniLogo,
  cardTag: 'Lending',
  cardButtonLabel: 'Earn',
  keyStats: {
    keyStat1: {
      useLabel: () => 'APY',
      skeletonSizingContent: '2.34%',
      useFormattedValue: recipe => {
        const apr = useDefaultExpectedAssetYield(recipe);
        if (apr === undefined) return;
        return formatPercentage_2dp(apr);
      },
    },
    keyStat2: {
      useLabel: () => 'L1 Liquidity',
      skeletonSizingContent: '$11B',
      useFormattedValue: recipe => {
        const liquidity = useDefaultLiquidity(recipe.id);
        if (liquidity === undefined) return;
        return formatBulkPrice_compact(liquidity);
      },
    },
    keyStat3: keyStatConfig_averageWait,
  },
  useEnterInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'enter',
    showUnderlying: true,
  }),
  useExitInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'exit',
    showUnderlying: false,
  }),
  positionKeyStat: {
    type: 'closable',
    useEnterText: useVariableAprText,
    useOpenText: useVariableAprText,
    useExitText: useVariableAprText,
  },
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: false }),
};

export const AAVE_DAI_CARD: CreateRecipeArgs = {
  ...AAVE_ETH_CARD,
  id: 'aave.DAI-to-wa2DAI',
  openHandleAssetAddress: KMAA.wa2DAI,
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.wa2DAI,
  shortDesc: 'Lend DAI on Aave and earn yield by holding wa2DAI in exchange.',
  exitDesc: 'Unwrap wa2DAI to recieve your underlying DAI.',
  longDescription: 'Lend DAI on Aave and earn yield by holding wa2DAI in exchange.',
};

import aaveLogo from '../../../images/aave_logo_white.svg';
import aaveMiniLogo from '../../../images/aave_mini_logo.png';
import { AaveV2BridgeData } from '@aztec/bridge-clients/client-dest/src/client/aavev2/aavev2-bridge-data.js';
import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultMarketSizeBulkPrice } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { createSimpleSwapFlowBinding } from '../flow_configs.js';

export const AAVE_ETH_CARD: CreateRecipeArgs = {
  id: 'aave.ETH-to-wa2ETH',
  bridgeBinding: 'ERC4626_400K',
  gradient: ['#9b559c', '#9b559c'],
  openHandleAssetBinding: 'wa2WETH',
  flowBindings: createSimpleSwapFlowBinding('Eth', 'wa2WETH'),
  createAdaptor: provider => AaveV2BridgeData.create(provider),
  enterAuxDataResolver: {
    type: 'static',
    value: 0n, // Deposit flow
  },
  exitAuxDataResolver: {
    type: 'static',
    value: 1n, // Exit flow
  },
  projectName: 'Aave',
  website: 'https://www.aave.com/',
  websiteLabel: 'aave.com',
  name: 'Aave',
  shortDesc: 'Lend ETH on Aave and earn yield by holding wa2WETH in exchange.',
  exitDesc: 'Unwrap wa2WETH to recieve your underlying ETH.',
  longDescription: 'Lend ETH on Aave and earn yield by holding wa2WETH in exchange.',
  logo: aaveLogo,
  miniLogo: aaveMiniLogo,
  cardTag: 'Lending',
  cardButtonLabel: 'Earn',
  exitButtonLabel: 'Claim & Exit',
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
        const liquidity = useDefaultMarketSizeBulkPrice(recipe.id);
        if (liquidity === undefined) return;
        return formatBulkPrice_compact(liquidity);
      },
    },
    keyStat3: keyStatConfig_averageWait,
  },
  useEnterInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'enter',
    showUnderlying: true,
    outputSelection: 'A',
  }),
  useExitInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'exit',
    showUnderlying: false,
    outputSelection: 'A',
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
  openHandleAssetBinding: 'wa2DAI',
  flowBindings: createSimpleSwapFlowBinding('DAI', 'wa2DAI'),
  shortDesc: 'Lend DAI on Aave and earn yield by holding wa2DAI in exchange.',
  exitDesc: 'Unwrap wa2DAI to recieve your underlying DAI.',
  longDescription: 'Lend DAI on Aave and earn yield by holding wa2DAI in exchange.',
};

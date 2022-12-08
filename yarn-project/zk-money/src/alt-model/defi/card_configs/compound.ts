import copmoundLogo from '../../../images/compound_logo_white.svg';
import compoundMiniLogo from '../../../images/compound_mini_logo.png';
import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultMarketSizeBulkPrice } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { createSimpleSwapFlowBinding } from '../flow_configs.js';
import { CompoundBridgeData } from '../../../bridge-clients/client/compound/compound-bridge-data.js';

export const COMPOUND_DAI_CARD: CreateRecipeArgs = {
  id: 'compound.DAI-to-weETH',
  unlisted: true,
  bridgeBinding: 'ERC4626_400K',
  exitBridgeBinding: 'ERC4626_300K',
  gradient: ['rgb(96, 208, 153)', 'rgb(96, 208, 153)'],
  openHandleAssetBinding: 'wcDAI',
  flowBindings: createSimpleSwapFlowBinding('DAI', 'wcDAI'),
  createAdaptor: ({ provider }) => CompoundBridgeData.create(provider),
  enterAuxDataResolver: {
    type: 'static',
    value: 0n, // Deposit flow
  },
  exitAuxDataResolver: {
    type: 'static',
    value: 1n, // Exit flow
  },
  projectName: 'Compound',
  website: 'https://compound.finance/',
  websiteLabel: 'compound.finance',
  name: 'Compound',
  shortDesc: 'Lend DAI on Compound and earn yield by holding wcDAI in exchange.',
  exitDesc: 'Unwrap wcDAI to recieve your underlying DAI.',
  longDescription: 'Lend DAI on Compound and earn yield by holding wcDAI in exchange.',
  logo: copmoundLogo,
  miniLogo: compoundMiniLogo,
  cardTag: 'Lending',
  cardButtonLabel: 'Earn',
  exitButtonLabel: 'Claim & Exit',
  showExchangeRate: true,
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

import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultMarketSizeBulkPrice } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { createSimpleSwapFlowBinding } from '../flow_configs.js';
import { SetUniswapBridgeData } from '../../../bridge-clients/client/uniswap/set-uniswap-bridge-data.js';
import setUniswapLogo from '../../../images/set_uniswap_logo_white.svg';
import setMiniLogo from '../../../images/set_mini_logo.svg';

export const SET_UNISWAP_CARD: CreateRecipeArgs = {
  id: 'set-uniswap.ETH-to-icETH',
  unlisted: true,
  bridgeBinding: 'Uniswap_800K',
  gradient: ['rgb(76, 113, 236)', 'rgb(76, 113, 236)'],
  openHandleAssetBinding: 'icETH',
  flowBindings: createSimpleSwapFlowBinding('Eth', 'icETH'),
  createAdaptor: ({ provider, bridgeAddressId, bridgeContractAddress }) =>
    SetUniswapBridgeData.create(provider, bridgeAddressId, bridgeContractAddress),
  enterAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[0],
  },
  exitAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[0],
  },
  projectName: 'Set',
  website: 'https://www.tokensets.com/',
  websiteLabel: 'tokensets.com',
  name: 'Set × Uniswap',
  shortDesc: 'Swap ETH for Interest Compounding ETH (icETH) via Uniswap.',
  exitDesc: 'Swap your icETH back for ETH.',
  longDescription: 'Swap ETH for Interest Compounding ETH (icETH) via Uniswap.',
  logo: setUniswapLogo,
  miniLogo: setMiniLogo,
  cardTag: 'Staking',
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
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: true }),
};

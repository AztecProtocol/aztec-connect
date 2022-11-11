import lidoXCurveLogo from '../../../images/lido_x_curve_logo.svg';
import lidoMiniLogo from '../../../images/lido_mini_logo.png';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from '../../../alt-model/known_assets/known_asset_addresses.js';
import { createLidoAdaptor } from '../bridge_data_adaptors/lido_adaptor.js';
import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultLiquidity } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';

export const LIDO_CARD: CreateRecipeArgs = {
  id: 'lido-staking-x-curve.ETH-to-wStETH',
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 6),
  gradient: ['#EE964B', '#EE964B'],
  openHandleAssetAddress: KMAA.wstETH,
  entryInputAssetAddressA: KMAA.ETH,
  entryOutputAssetAddressA: KMAA.wstETH,
  createAdaptor: createLidoAdaptor,
  enterAuxDataResolver: {
    type: 'static',
    value: 10n ** 18n, // Minimum acceptable amount of stEth per 1 eth
  },
  exitAuxDataResolver: {
    type: 'static',
    value: 9n * 10n ** 17n, // Minimum acceptable amount of eth per 1 stEth
  },
  projectName: 'Lido',
  website: 'https://lido.fi/',
  websiteLabel: 'lido.fi',
  name: 'Lido Staking × Curve',
  shortDesc: 'Swap ETH for stETH on Curve and earn daily staking rewards. stETH is wrapped into wstETH.',
  exitDesc: 'Unwrap zkwstETH and swap on Curve to get back zkETH.',
  longDescription:
    'Swap ETH for liquid staked ETH (stETH) on Curve and earn daily staking rewards. stETH is wrapped into wstETH, allowing you to earn staking yields without locking assets.',
  logo: lidoXCurveLogo,
  miniLogo: lidoMiniLogo,
  cardTag: 'Staking',
  cardButtonLabel: 'Earn',
  keyStats: {
    keyStat1: {
      useLabel: () => 'APR',
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
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: true }),
};

import eulerLogo from '../../../images/euler_logo.svg';
import eulerMiniLogo from '../../../images/euler_mini_logo.png';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from '../../../alt-model/known_assets/known_asset_addresses.js';
import { EulerBridgeData } from '@aztec/bridge-clients/client-dest/src/client/euler/euler-bridge-data.js';
import { CreateRecipeArgs } from '../types.js';
import { useDefaultExpectedAssetYield, useDefaultLiquidity } from '../defi_info_hooks.js';
import { formatBulkPrice_compact, formatPercentage_2dp } from '../../../app/util/formatters.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';

export const EULER_ETH_CARD: CreateRecipeArgs = {
  id: 'euler.ETH-to-weETH',
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 10),
  gradient: ['#414066', '#414066'],
  openHandleAssetAddress: KMAA.weWETH,
  entryInputAssetAddressA: KMAA.ETH,
  entryOutputAssetAddressA: KMAA.weWETH,
  createAdaptor: provider => EulerBridgeData.create(provider),
  enterAuxDataResolver: {
    type: 'static',
    value: 0n, // Deposit flow
  },
  exitAuxDataResolver: {
    type: 'static',
    value: 1n, // Exit flow
  },
  projectName: 'Euler',
  website: 'https://www.euler.finance/',
  websiteLabel: 'euler.finance',
  name: 'Euler',
  shortDesc: 'Lend ETH on Euler and earn yield by holding weWETH in exchange.',
  exitDesc: 'Unwrap weWETH to recieve your underlying ETH.',
  longDescription: 'Lend ETH on Euler and earn yield by holding weWETH in exchange.',
  logo: eulerLogo,
  miniLogo: eulerMiniLogo,
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

export const EULER_WSTETH_CARD: CreateRecipeArgs = {
  ...EULER_ETH_CARD,
  id: 'euler.wstETH-to-wewstETH',
  openHandleAssetAddress: KMAA.wewstETH,
  entryInputAssetAddressA: KMAA.wstETH,
  entryOutputAssetAddressA: KMAA.wewstETH,
  shortDesc: 'Lend wstETH on Euler and earn yield by holding wewstETH in exchange.',
  exitDesc: 'Unwrap weestWETH to recieve your underlying wstETH.',
  longDescription: 'Lend wstETH on Euler and earn yield by holding wewstETH in exchange.',
};

export const EULER_DAI_CARD: CreateRecipeArgs = {
  ...EULER_ETH_CARD,
  id: 'euler.DAI-to-weDAI',
  openHandleAssetAddress: KMAA.weDAI,
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.weDAI,
  shortDesc: 'Lend DAI on Euler and earn yield by holding weDAI in exchange.',
  exitDesc: 'Unwrap weDAI to recieve your underlying DAI.',
  longDescription: 'Lend wstETH on Euler and earn yield by holding wewstETH in exchange.',
};

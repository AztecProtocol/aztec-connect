import yearnLogo from '../../../images/yearn_logo.svg';
import yearnGradientLogo from '../../../images/yearn_gradient.svg';
import { createYearnAdaptor } from '../bridge_data_adaptors/yearn_adaptor.js';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from '../../../alt-model/known_assets/known_asset_addresses.js';
import { CreateRecipeArgs } from '../types.js';
import { keyStatConfig_apr, keyStatConfig_liquidity, keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';

export const YEARN_ETH_CARD: CreateRecipeArgs = {
  id: 'yearn-finance.ETH-to-yvETH',
  openHandleAssetAddress: KMAA.yvETH,
  entryInputAssetAddressA: KMAA.ETH,
  entryOutputAssetAddressA: KMAA.yvETH,
  createAdaptor: createYearnAdaptor,
  projectName: 'Yearn Finance',
  gradient: ['#7A9CC6', '#7A9CC6'],
  website: 'https://yearn.finance/',
  websiteLabel: 'yearn.finance',
  name: 'Yearn Finance',
  shortDesc: `Deposit ETH into Yearn's vault to easily generate yield with a passive investing strategy.`,
  longDescription:
    'Depositing into the Yearn vault, pools the capital and uses the Yearn strategies to automate yield generation and rebalancing. Your position is represented with yvETH.',
  logo: yearnLogo,
  miniLogo: yearnGradientLogo,
  cardTag: 'Yield',
  cardButtonLabel: 'Earn',
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 7),
  selectExitBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 8),
  enterAuxDataResolver: { type: 'static', value: 0 },
  exitAuxDataResolver: { type: 'static', value: 1 },
  keyStats: {
    keyStat1: { ...keyStatConfig_apr, useLabel: () => 'APY' },
    keyStat2: keyStatConfig_liquidity,
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

export const YEARN_DAI_CARD: CreateRecipeArgs = {
  ...YEARN_ETH_CARD,
  id: 'yearn-finance.DAI-to-yvDAI',
  openHandleAssetAddress: KMAA.yvDAI,
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.yvDAI,
  shortDesc: `Deposit DAI into Yearn's vault to easily generate yield with a passive investing strategy.`,
  longDescription:
    'Depositing into the Yearn vault, pools the capital and uses the Yearn strategies to automate yield generation and rebalancing. Your position is represented with yvDAI.',
};

import yearnLogo from '../../../images/yearn_logo.svg';
import yearnGradientLogo from '../../../images/yearn_gradient.svg';
import { CreateRecipeArgs } from '../types.js';
import { keyStatConfig_apr, keyStatConfig_liquidity, keyStatConfig_averageWait } from '../key_stat_configs.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { useVariableAprText } from '../position_key_stat_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { createSimpleSwapFlowBinding } from '../flow_configs.js';
import { YearnBridgeData } from '../../../bridge-clients/client/yearn/yearn-bridge-data.js';

export const YEARN_ETH_CARD: CreateRecipeArgs = {
  id: 'yearn-finance.ETH-to-yvETH',
  openHandleAssetBinding: 'yvWETH',
  flowBindings: createSimpleSwapFlowBinding('Eth', 'yvWETH'),
  createAdaptor: ({ provider, rollupContractAddress }) => YearnBridgeData.create(provider, rollupContractAddress),
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
  exitButtonLabel: 'Claim & Exit',
  bridgeBinding: 'YearnBridgeDeposit_200K',
  exitBridgeBinding: 'YearnBridgeWithdraw_800K',
  enterAuxDataResolver: { type: 'static', value: 0n },
  exitAuxDataResolver: { type: 'static', value: 1n },
  keyStats: {
    keyStat1: { ...keyStatConfig_apr, useLabel: () => 'APY' },
    keyStat2: keyStatConfig_liquidity,
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

export const YEARN_DAI_CARD: CreateRecipeArgs = {
  ...YEARN_ETH_CARD,
  id: 'yearn-finance.DAI-to-yvDAI',
  openHandleAssetBinding: 'yvDAI',
  flowBindings: createSimpleSwapFlowBinding('DAI', 'yvDAI'),
  shortDesc: `Deposit DAI into Yearn's vault to easily generate yield with a passive investing strategy.`,
  longDescription:
    'Depositing into the Yearn vault, pools the capital and uses the Yearn strategies to automate yield generation and rebalancing. Your position is represented with yvDAI.',
};

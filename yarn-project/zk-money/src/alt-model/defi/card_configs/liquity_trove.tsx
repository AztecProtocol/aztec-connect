import { TroveBridgeData } from '../../../bridge-clients/client/liquity/trove-bridge-data.js';
import liquityLogo from '../../../images/liquity_logo_white.svg';
import liquityMiniLogo from '../../../images/liquity_mini_logo.svg';
import { CreateRecipeArgs, DefiRecipe } from '../types.js';
import { useBridgeDataAdaptorsMethodCaches } from '../../top_level_context/index.js';
import { useMaybeObs } from '../../../app/util/index.js';
import { AssetValue, EthAddress } from '@aztec/sdk';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { useDefaultMarketSizeBulkPrice } from '../defi_info_hooks.js';
import { formatBulkPrice_compact } from '../../../app/util/formatters.js';
import { DefiPosition_Interactable } from '../open_position_hooks.js';
import { SkeletonRect } from '../../../ui-components/index.js';
import { formatBaseUnits } from '../../../app/units.js';

export const LIQUITY_TROVE_275: CreateRecipeArgs = {
  id: 'liquity-trove.ETH-to-TB-and-LUSD.275',
  unlisted: true,
  bridgeBinding: 'Liquity275_550K',
  openHandleAssetBinding: 'TB-275',
  flowBindings: {
    type: 'closable',
    enter: { inA: 'Eth', outA: 'TB-275', outB: 'LUSD', inDisplayed: 'Eth', outDisplayed: 'LUSD' },
    exit: {
      inA: 'TB-275',
      inB: 'LUSD',
      outA: 'Eth',
      outB: 'LUSD',
      inDisplayed: 'LUSD',
      outDisplayed: 'Eth',
    },
  },
  createAdaptor: (provider, _, bridgeAddress) =>
    TroveBridgeData.create(provider, EthAddress.fromString(bridgeAddress) as any),
  enterAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[0], // Max borrower fee
  },
  exitAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[0], // Max borrower fee
  },
  projectName: 'Liquity Trove',
  gradient: ['rgb(111, 100, 218)', 'rgb(111, 100, 218)'],
  website: 'https://www.liquity.org/',
  websiteLabel: 'liquity.org',
  name: 'Liquity Trove',
  shortDesc: 'Borrow LUSD by paying a one-time fee and depositing ETH as collateral.',
  longDescription: 'Borrow LUSD by paying a one-time fee and depositing ETH collateral.',
  logo: liquityLogo,
  miniLogo: liquityMiniLogo,
  cardTag: 'Borrowing',
  cardButtonLabel: 'Borrow',
  exitButtonLabel: 'Repay',
  keyStats: {
    keyStat1: {
      useLabel: () => 'Col. Ratio',
      skeletonSizingContent: '30%',
      useFormattedValue: recipe => {
        const cache = useBridgeDataAdaptorsMethodCaches().currentCollateralRatioPollerCache;
        const poller = cache.get(recipe.id);
        const ratio = useMaybeObs(poller?.obs);
        if (ratio === undefined) return;
        return `${ratio}%`;
      },
    },
    keyStat2: {
      useLabel: () => 'Col. Total',
      skeletonSizingContent: '$11B',
      useFormattedValue: recipe => {
        const liquidity = useDefaultMarketSizeBulkPrice(recipe.id);
        if (liquidity === undefined) return;
        return formatBulkPrice_compact(liquidity);
      },
    },
    keyStat3: keyStatConfig_averageWait,
  },
  positionKeyStat: {
    type: 'closable',
    useEnterText: () => '',
    useOpenText: useFormattedLusdDebt,
    useExitText: () => '',
  },
  useEnterInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'enter',
    showUnderlying: false,
    outputSelection: 'B',
  }),
  useExitInteractionPredictionInfo: bindInteractionPredictionHook_expectedOutput({
    direction: 'exit',
    showUnderlying: false,
    outputSelection: 'A',
  }),
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: true }),
  openHandleAssetHasDebtAndCollateral: true,
  renderCustomClosableValueField: position => <FormattedEthCollateral position={position} />,
};

export const LIQUITY_TROVE_400: CreateRecipeArgs = {
  ...LIQUITY_TROVE_275,
  id: 'liquity-trove.ETH-to-TB-and-LUSD.400',
  bridgeBinding: 'Liquity400_550K',
  openHandleAssetBinding: 'TB-400',
  flowBindings: {
    type: 'closable',
    enter: { inA: 'Eth', outA: 'TB-400', outB: 'LUSD', inDisplayed: 'Eth', outDisplayed: 'LUSD' },
    exit: {
      inA: 'TB-400',
      inB: 'LUSD',
      outA: 'Eth',
      outB: 'LUSD',
      inDisplayed: 'LUSD',
      outDisplayed: 'Eth',
    },
  },
};

function useFormattedLusdDebt(recipe: DefiRecipe, assetValue: AssetValue) {
  const cache = useBridgeDataAdaptorsMethodCaches().userDebtAndCollateralPollerCache;
  const poller = cache.get([recipe.id, assetValue.value]);
  const debtAndCollateral = useMaybeObs(poller?.obs);
  const debt = debtAndCollateral?.[0];
  if (debt === undefined) return;
  return `Debt: ${formatBaseUnits(debt, 18, { precision: 2, commaSeparated: true })} LUSD`;
}

function FormattedEthCollateral({ position }: { position: DefiPosition_Interactable }) {
  const cache = useBridgeDataAdaptorsMethodCaches().userDebtAndCollateralPollerCache;
  const poller = cache.get([position.recipe.id, position.handleValue.value]);
  const debtAndCollateral = useMaybeObs(poller?.obs);
  const collateral = debtAndCollateral?.[1];
  if (collateral === undefined) return <SkeletonRect sizingContent="Collateral: 0.123 ETH" />;
  return <>Collateral: {formatBaseUnits(collateral, 18, { precision: 6, commaSeparated: true })} ETH</>;
}

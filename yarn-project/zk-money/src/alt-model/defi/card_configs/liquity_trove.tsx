import { TroveBridgeData } from '../../../bridge-clients/client/liquity/trove-bridge-data.js';
import liquityLogo from '../../../images/liquity_logo_white.svg';
import liquityMiniLogo from '../../../images/liquity_mini_logo.svg';
import { AuxDataCustomisationComponentProps, CreateRecipeArgs, DefiRecipe } from '../types.js';
import { useBridgeDataAdaptorsMethodCaches } from '../../top_level_context/index.js';
import { AssetValue } from '@aztec/sdk';
import { createGatedSetter_noArrows, useMaybeObs } from '../../../app/util/index.js';
import { bindInteractionPredictionHook_expectedOutput } from '../interaction_prediction_configs.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { useBridgeDataAdaptor, useDefaultMarketSizeBulkPrice } from '../defi_info_hooks.js';
import { formatBulkPrice_compact } from '../../../app/util/formatters.js';
import { DefiPosition_Interactable } from '../open_position_hooks.js';
import { Field, FieldStatus, SkeletonRect } from '../../../ui-components/index.js';
import { formatBaseUnits } from '../../../app/units.js';
import { useEffect, useState } from 'react';

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
      outA: 'Eth',
      inDisplayed: 'TB-275',
      outDisplayed: 'Eth',
    },
  },
  createAdaptor: ({ provider, bridgeContractAddress, bridgeAddressId }) =>
    TroveBridgeData.create(provider, bridgeAddressId, bridgeContractAddress),
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
  exitDesc:
    'Your LUSD debt is repaid using a flash loan. Part of your ETH collateral then repays the flash loan, and the remaining ETH is returned to your account. Your total TB-275 tokens represents the entirety of your share of the collateral. Spending all your TB-275 will release your entire share of the collateral (minus the market value of the debt to be repaid).',
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
  renderExitAuxDataCustomiser: props => <SlippageSelect {...props} />,
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
      outA: 'Eth',
      inDisplayed: 'TB-400',
      outDisplayed: 'Eth',
    },
  },
  exitDesc:
    'Your LUSD debt is repaid using a flash loan. Part of your ETH collateral then repays the flash loan, and the remaining ETH is returned to your account. Your total TB-400 tokens represents the entirety of your share of the collateral. Spending all your TB-400 will release your entire share of the collateral (minus the market value of the debt to be repaid).',
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

function formatBasisPoints(basisPoints: bigint | undefined) {
  if (basisPoints === undefined) return '';
  const str = basisPoints.toString();
  const whole = str.substring(0, str.length - 2);
  const fractional = str.substring(str.length - 2);
  return `${whole}.${fractional}`;
}

function SlippageSelect(props: AuxDataCustomisationComponentProps) {
  const adaptor = useBridgeDataAdaptor(props.recipe.id);
  const idealSlippage = (adaptor as TroveBridgeData | undefined)?.IDEAL_SLIPPAGE_SETTING;
  const placeholder = formatBasisPoints(idealSlippage);
  const [slippageStr, setSlippageStr] = useState('');
  const handleSlippageStrChange = (value: string) => setSlippageStr(value.match(/^\d*\.?\d*/)?.[0] ?? '');

  const slippage = slippageStr ? BigInt(Math.floor(Number(slippageStr) * 100)) : null;
  useEffect(() => {
    const gatedSetter = createGatedSetter_noArrows(props.onChangeState);
    if (slippage === null) {
      gatedSetter.set({ auxData: null, loading: false });
      return;
    }
    gatedSetter.set({ auxData: null, loading: true });
    adaptor?.getCustomMaxPrice?.(slippage).then(auxData => {
      gatedSetter.set({ auxData, loading: false });
    });
    return gatedSetter.close;
  }, [props.onChangeState, slippage, adaptor]);
  const status = props.state.loading ? FieldStatus.Loading : undefined;

  return (
    <div style={{ height: 80 }}>
      <Field
        label="Slippage tolerance (%)"
        placeholder={placeholder}
        value={slippageStr}
        onChangeValue={handleSlippageStrChange}
        status={status}
      />
    </div>
  );
}

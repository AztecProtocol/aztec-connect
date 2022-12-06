import elementFiLogo from '../../../images/element_fi_logo.svg';
import elementMiniLogo from '../../../images/element_mini_logo.png';
import { BridgeInteraction, CreateRecipeArgs, DefiRecipe } from '../types.js';
import { formatDate_short, formatPercentage_1dp } from '../../../app/util/formatters.js';
import { useCurrentAssetYield, useDefaultAuxDataOption, useDefaultTermApr, useTermApr } from '../defi_info_hooks.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { EthAddress, UserDefiTx } from '@aztec/sdk';
import { Amount } from '../../../alt-model/assets/index.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';
import { ElementBridgeData } from '../../../bridge-clients/client/element/element-bridge-data.js';

export const ELEMENT_CARD: CreateRecipeArgs = {
  id: 'element-finance.DAI-to-DAI',
  isAsync: true,
  bridgeBinding: 'ElementBridge_800K',
  flowBindings: {
    type: 'async',
    enter: { inA: 'DAI', outA: 'DAI', inDisplayed: 'DAI', outDisplayed: 'DAI' },
  },
  createAdaptor: ({ provider, rollupContractAddress, bridgeContractAddress, rollupProviderUrl }) => {
    const balancerAddress = EthAddress.fromString('0xBA12222222228d8Ba445958a75a0704d566BF2C8');
    return ElementBridgeData.create(
      provider,
      bridgeContractAddress,
      balancerAddress,
      rollupContractAddress,
      rollupProviderUrl,
    );
  },
  enterAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[opts.length - 1], // Tranche expiry timestamp
  },
  projectName: 'Element',
  gradient: ['#0090C1', '#0090C1'],
  website: 'https://element.fi/',
  websiteLabel: 'element.fi',
  name: 'Element Fixed Yield',
  shortDesc: 'Deposit zkDai to Element for fixed yield. Funds are locked in Element and returned at the maturity date.',
  longDescription:
    'Element allows you to invest assets for a fixed yield. Deposit an asset today and receive it back on the maturity date with a fixed APR.',
  logo: elementFiLogo,
  miniLogo: elementMiniLogo,
  cardTag: 'Fixed Yield',
  cardButtonLabel: 'Earn',
  keyStats: {
    keyStat1: {
      useLabel: () => 'APR',
      skeletonSizingContent: '2.34%',
      useFormattedValue: recipe => {
        const termApr = useDefaultTermApr(recipe);
        if (termApr === undefined) return;
        return formatPercentage_1dp(termApr);
      },
    },
    keyStat2: {
      useLabel: () => 'Maturity',
      skeletonSizingContent: '16 Sept 2022',
      useFormattedValue: recipe => {
        const auxData = useDefaultAuxDataOption(recipe.id);
        if (auxData === undefined) return;
        return formatDate_short(Number(auxData) * 1000);
      },
    },
    keyStat3: keyStatConfig_averageWait,
  },
  positionKeyStat: {
    type: 'async',
    useEnterText: useFixedAprFromDefaultTermApr,
    useOpenText: useFixedApyFromInteractionNonce,
    useExitText: useFixedApyFromInteractionNonce,
  },
  useEnterInteractionPredictionInfo: (recipe, interaction) => {
    return {
      type: 'labelled-value',
      label: 'ROI after maturity',
      formattedValue: useFormattedRoi(recipe, interaction),
    };
  },
  getAsyncResolutionDate: tx => Number(tx.bridgeCallData.auxData) * 1000,
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: true }),
};

export const FLUSHED_ELEMENT_CARD: CreateRecipeArgs = {
  ...ELEMENT_CARD,
  id: 'element-finance-flushed.DAI-to-DAI',
  unlisted: true,
  bridgeBinding: 'ElementBridge_2M',
};

function useFixedAprFromDefaultTermApr(recipe: DefiRecipe) {
  const termApr = useDefaultTermApr(recipe);
  if (termApr === undefined) return;
  return `Fixed: ${formatPercentage_1dp(termApr)} APR`;
}

function useFixedApyFromInteractionNonce(recipe: DefiRecipe, tx: UserDefiTx) {
  const { interactionNonce } = tx.interactionResult;
  if (interactionNonce === undefined) {
    throw new Error('Open async position missing interaction nonce.');
  }
  const expectedYield = useCurrentAssetYield(recipe, interactionNonce);
  if (expectedYield === undefined) return;
  return `Fixed: ${formatPercentage_1dp(expectedYield)} APR`;
}

const YEAR_IN_SECS = 60 * 60 * 24 * 365.2425;

function useFormattedRoi(recipe: DefiRecipe, interaction: BridgeInteraction) {
  const {
    bridgeCallData: { auxData },
    inputValue,
  } = interaction;
  const termApr = useTermApr(recipe, auxData, inputValue);
  if (termApr === undefined) return;
  const nowSec = Date.now() / 1000;
  const timeUntilMaturityInYears = (Number(auxData) - nowSec) / YEAR_IN_SECS;
  const roiAfterMaturity = BigInt(Math.floor(Number(inputValue) * (termApr / 100) * timeUntilMaturityInYears));
  return new Amount(roiAfterMaturity, recipe.flow.enter.outA).format({ uniform: true });
}

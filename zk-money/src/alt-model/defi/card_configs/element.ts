import elementFiLogo from 'images/element_fi_logo.svg';
import elementMiniLogo from 'images/element_mini_logo.png';
import ethToDaiBanner from 'images/eth_to_dai_banner.svg';
import { createElementAdaptor } from '../bridge_data_adaptors/element_adaptor';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { BridgeInteraction, CreateRecipeArgs, DefiRecipe } from '../types';
import { formatDate_short, formatPercentage_1dp } from 'app/util/formatters';
import { useCurrentAssetYield, useDefaultAuxDataOption, useDefaultTermApr, useTermApr } from '../defi_info_hooks';
import { keyStatConfig_nextBatch } from '../key_stat_configs';
import { UserDefiTx } from '@aztec/sdk';
import { Amount } from 'alt-model/assets';

export const ELEMENT_CARD: CreateRecipeArgs = {
  id: 'element-finance.DAI-to-DAI',
  isAsync: true,
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 9),
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.DAI,
  createAdaptor: createElementAdaptor,
  enterAuxDataResolver: {
    type: 'bridge-data-select',
    selectOpt: opts => opts[opts.length - 1], // Tranche expiry timestamp
  },
  projectName: 'Element',
  gradient: ['#2E69C3', '#6ACDE2'],
  website: 'https://element.fi/',
  websiteLabel: 'element.fi',
  name: 'Element Fixed Yield',
  shortDesc: 'Deposit zkDai to Element for fixed yield. Funds are locked in Element and returned at the maturity date.',
  longDescription:
    'Element allows you to invest assets for a fixed yield. Deposit an asset today and receive it back on the maturity date with a fixed APR.',
  bannerImg: ethToDaiBanner,
  logo: elementFiLogo,
  miniLogo: elementMiniLogo,
  cardTag: 'Fixed Yield',
  cardButtonLabel: 'Earn',
  keyStats: {
    keyStat1: {
      label: 'APR',
      skeletonSizingContent: '2.34%',
      useFormattedValue: recipe => {
        const termApr = useDefaultTermApr(recipe);
        if (termApr === undefined) return;
        return formatPercentage_1dp(termApr);
      },
    },
    keyStat2: {
      label: 'Maturity',
      skeletonSizingContent: '16 Sept 2022',
      useFormattedValue: recipe => {
        const auxData = useDefaultAuxDataOption(recipe.id);
        if (auxData === undefined) return;
        return formatDate_short(auxData * 1000);
      },
    },
    keyStat3: keyStatConfig_nextBatch,
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
  getAsyncResolutionDate: tx => tx.bridgeCallData.auxData * 1000,
};

export const OLD_ELEMENT_CARD: CreateRecipeArgs = {
  ...ELEMENT_CARD,
  id: 'element-finance-old.DAI-to-DAI',
  unlisted: true,
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 1),
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
  const timeUntilMaturityInYears = (auxData - nowSec) / YEAR_IN_SECS;
  const roiAfterMaturity = BigInt(Math.floor(Number(inputValue) * (termApr / 100) * timeUntilMaturityInYears));
  return new Amount(roiAfterMaturity, recipe.flow.enter.outA).format({ uniform: true });
}

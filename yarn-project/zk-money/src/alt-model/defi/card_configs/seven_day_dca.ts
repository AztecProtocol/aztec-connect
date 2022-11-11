import dcaLogo from '../../../images/dca_logo.png';
import dcaMiniLogo from '../../../images/dca_mini_logo.png';
import { createDcaAdaptor } from '../bridge_data_adaptors/dca_adaptor.js';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from '../../../alt-model/known_assets/known_asset_addresses.js';
import { CreateRecipeArgs } from '../types.js';
import { keyStatConfig_averageWait } from '../key_stat_configs.js';
import { useChainLinkPollerCache } from '../../../alt-model/top_level_context/index.js';
import { CHAIN_LINK_ORACLE_ADDRESSES } from '../../../alt-model/price_feeds/chain_link_oracles.js';
import { useMaybeObs } from '../../../app/util/index.js';
import { formatBaseUnits } from '../../../app/index.js';
import { Amount } from '../../../alt-model/assets/index.js';
import { createDefiPublishStatsCacheArgsBuilder } from '../defi_publish_stats_utils.js';

export const SEVEN_DAY_DCA_CARD_DAI_TO_ETH: CreateRecipeArgs = {
  id: 'seven-day-dca.DAI-to-ETH',
  isAsync: true,
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 11),
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.ETH,
  createAdaptor: createDcaAdaptor,
  enterAuxDataResolver: {
    type: 'static',
    value: 7n, // Duration in ticks (days)
  },
  projectName: '7 Day DCA',
  gradient: ['#3BB273', '#3BB273'],
  website: 'https://github.com/AztecProtocol/aztec-connect-bridges/blob/master/src/specs/dca/readme.md',
  websiteLabel: 'DCA Spec',
  name: 'Dollar-Cost Averaging',
  shortDesc: 'Dollar-Cost Averaging: Automate ETH purchases to smooth out short-term price movements.',
  longDescription:
    "Your DAI deposit is divided across 7 daily DAI to ETH swaps, purchasing more ETH when its price is low and less when its high. The contract's pool uses external trades and uniswap as a fallbacks.",
  logo: dcaLogo,
  miniLogo: dcaMiniLogo,
  cardTag: '7 Day DCA',
  cardButtonLabel: 'Invest',
  keyStats: {
    keyStat1: {
      useLabel: () => 'Duration',
      skeletonSizingContent: '7 Days',
      useFormattedValue: () => '7 Days',
    },
    keyStat2: {
      useLabel: () => 'DAI for 1 ETH',
      skeletonSizingContent: '$11B',
      useFormattedValue: () => {
        const daiFor1Eth = useDaiFor1Eth();
        if (daiFor1Eth === undefined) return;
        return formatDai_2dp(daiFor1Eth);
      },
    },
    keyStat3: keyStatConfig_averageWait,
  },
  positionKeyStat: {
    type: 'async',
    useEnterText: useDaiToEthExchangeRateText,
    useOpenText: useDaiToEthExchangeRateText,
    useExitText: useDaiToEthExchangeRateText,
  },
  useEnterInteractionPredictionInfo: (_, { inputValue, inputAssetA }) => {
    const formattedValue = new Amount(inputValue, inputAssetA).format({ uniform: true, layer: 'L1' });
    return {
      type: 'text-only',
      text: `You will be purchasing ETH with ${formattedValue} over 7 Days.`,
    };
  },
  getAsyncResolutionDate: tx => {
    if (!tx.settled) return;
    return tx.settled?.getTime() + SEVEN_DAYS_MS;
  },
  getDefiPublishStatsCacheArgs: createDefiPublishStatsCacheArgsBuilder({ ignoreAuxData: false }),
};

export const SEVEN_DAY_DCA_CARD_ETH_TO_DAI: CreateRecipeArgs = {
  ...SEVEN_DAY_DCA_CARD_DAI_TO_ETH,
  id: 'seven-day-dca.ETH-to-DAI',
  entryInputAssetAddressA: KMAA.ETH,
  entryOutputAssetAddressA: KMAA.DAI,
  shortDesc: 'Dollar-Cost Averaging: Automate DAI purchases to smooth out short-term price movements.',
  longDescription:
    "Your ETH deposit is divided across 7 daily ETH to DAI swaps, purchasing more DAI when the price of ETH is high and less DAI when the price of ETH is low. The contract's pool uses external trades and uniswap as a fallbacks.",
  keyStats: {
    ...SEVEN_DAY_DCA_CARD_DAI_TO_ETH.keyStats,
    keyStat2: {
      useLabel: () => 'ETH for 1k DAI',
      skeletonSizingContent: '$11B',
      useFormattedValue: () => {
        const daiFor1Eth = useEthFor1Dai();
        if (daiFor1Eth === undefined) return;
        return formatEth_6dp(daiFor1Eth * 1000n);
      },
    },
  },
  positionKeyStat: {
    type: 'async',
    useEnterText: useEthToDaiExchangeRateText,
    useOpenText: useEthToDaiExchangeRateText,
    useExitText: useEthToDaiExchangeRateText,
  },
  useEnterInteractionPredictionInfo: (_, { inputValue, inputAssetA }) => {
    const formattedValue = new Amount(inputValue, inputAssetA).format({ uniform: true, layer: 'L1' });
    return {
      type: 'text-only',
      text: `You will be purchasing DAI with ${formattedValue} over 7 Days.`,
    };
  },
};

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

function formatDai_2dp(baseUnits: bigint) {
  return formatBaseUnits(baseUnits, 18, { precision: 2, commaSeparated: true });
}

function formatEth_6dp(baseUnits: bigint) {
  return formatBaseUnits(baseUnits, 18, { precision: 6, commaSeparated: true });
}

function useDaiToEthExchangeRateText() {
  const daiFor1Eth = useDaiFor1Eth();
  if (daiFor1Eth === undefined) return;
  return `1 ETH ≈ ${formatDai_2dp(daiFor1Eth)} DAI`;
}

function useEthToDaiExchangeRateText() {
  const ethFor1Dai = useEthFor1Dai();
  if (ethFor1Dai === undefined) return;
  return `1k DAI ≈ ${formatEth_6dp(ethFor1Dai * 1000n)} ETH`;
}

function useEthFor1Dai() {
  const cache = useChainLinkPollerCache();
  const poller = cache.get(CHAIN_LINK_ORACLE_ADDRESSES.DAI_ETH);
  return useMaybeObs(poller.obs);
}

function useDaiFor1Eth() {
  const ethFor1Dai = useEthFor1Dai();
  if (ethFor1Dai === undefined) return;
  const daiFor1Eth = 10n ** 36n / ethFor1Dai;
  return daiFor1Eth;
}

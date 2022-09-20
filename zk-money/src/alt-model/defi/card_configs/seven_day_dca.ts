import dcaLogo from 'images/dca_logo.png';
import dcaMiniLogo from 'images/dca_mini_logo.png';
import ethToDaiBanner from 'images/eth_to_dai_banner.svg';
import { createDcaAdaptor } from '../bridge_data_adaptors/dca_adaptor';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';
import { CreateRecipeArgs } from '../types';
import { keyStatConfig_nextBatch } from '../key_stat_configs';
import { useChainLinkPollerCache } from 'alt-model/top_level_context';
import { CHAIN_LINK_ORACLE_ADDRESSES } from 'alt-model/price_feeds/chain_link_oracles';
import { useMaybeObs } from 'app/util';
import { formatBaseUnits } from 'app';
import { Amount } from 'alt-model/assets';

export const SEVEN_DAY_DCA_CARD: CreateRecipeArgs = {
  id: 'seven-day-dca.DAI-to-ETH',
  isAsync: true,
  selectBlockchainBridge: ({ bridges }) => bridges.find(x => x.id === 10),
  entryInputAssetAddressA: KMAA.DAI,
  entryOutputAssetAddressA: KMAA.ETH,
  createAdaptor: createDcaAdaptor,
  enterAuxDataResolver: {
    type: 'static',
    value: 7, // Duration in ticks (days)
  },
  projectName: '7 Day DCA',
  gradient: ['#183A37', '#A0AF84'],
  website: 'https://github.com/AztecProtocol/aztec-connect-bridges/blob/master/src/specs/dca/readme.md',
  websiteLabel: 'DCA Spec',
  name: 'Dollar-Cost Averaging',
  shortDesc: 'Dollar-Cost Averaging: Automate ETH purchases to smooth out short-term price movements.',
  longDescription:
    "Your DAI deposit is divided across 7 daily DAI to ETH swaps, purchasing more ETH when its price is low and less when its high. The contract's pool uses external trades and uniswap as a fallbacks.",
  bannerImg: ethToDaiBanner,
  logo: dcaLogo,
  miniLogo: dcaMiniLogo,
  cardTag: '7 Day DCA',
  keyStats: {
    keyStat1: {
      label: 'Duration',
      skeletonSizingContent: '7 Days',
      useFormattedValue: () => '7 Days',
    },
    keyStat2: {
      label: 'DAI for 1 ETH',
      skeletonSizingContent: '$11B',
      useFormattedValue: () => {
        const daiFor1Eth = useDaiFor1Eth();
        if (daiFor1Eth === undefined) return;
        return '$' + formatDai_2dp(daiFor1Eth);
      },
    },
    keyStat3: keyStatConfig_nextBatch,
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
};

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

function formatDai_2dp(baseUnits: bigint) {
  return formatBaseUnits(baseUnits, 18, { precision: 2, commaSeparated: true });
}

function useDaiToEthExchangeRateText() {
  const daiFor1Eth = useDaiFor1Eth();
  if (daiFor1Eth === undefined) return;
  return `1 ETH ≈ ${formatDai_2dp(daiFor1Eth)} DAI`;
}

function useDaiFor1Eth() {
  const cache = useChainLinkPollerCache();
  const poller = cache.get(CHAIN_LINK_ORACLE_ADDRESSES.DAI_ETH);
  const ethFor1Dai = useMaybeObs(poller.obs);
  if (ethFor1Dai === undefined) return;
  const daiFor1Eth = 10n ** 36n / ethFor1Dai;
  return daiFor1Eth;
}

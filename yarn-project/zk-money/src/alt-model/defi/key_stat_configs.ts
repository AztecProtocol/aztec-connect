import { formatBulkPrice_compact, formatPercentage_2dp } from '../../app/util/formatters.js';
import {
  useDefiBatchAverageTimeout,
  useDefiBatchData,
} from '../../features/defi/bridge_count_down/bridge_count_down_hooks.js';
import moment from 'moment';
import {
  useDefaultEnterBridgeCallData,
  useDefaultExpectedAssetYield,
  useDefaultMarketSizeBulkPrice,
} from './defi_info_hooks.js';
import { KeyStatConfig } from './types.js';
import { estimateTxSettlementTimes } from '../estimate_settlement_times.js';
import { useRollupProviderStatus } from '../rollup_provider_hooks.js';

export const keyStatConfig_liquidity: KeyStatConfig = {
  useLabel: () => 'L1 Liquidity',
  skeletonSizingContent: '$11B',
  useFormattedValue: recipe => {
    const liquidity = useDefaultMarketSizeBulkPrice(recipe.id);
    if (liquidity === undefined) return;
    return formatBulkPrice_compact(liquidity);
  },
};

export const keyStatConfig_apr: KeyStatConfig = {
  useLabel: () => 'APR',
  skeletonSizingContent: '2.34%',
  useFormattedValue: recipe => {
    const apr = useDefaultExpectedAssetYield(recipe);
    if (apr === undefined) return;
    return formatPercentage_2dp(apr);
  },
};

export const keyStatConfig_averageWait: KeyStatConfig = {
  useLabel: recipe => {
    const bridgeCallData = useDefaultEnterBridgeCallData(recipe);
    const batchData = useDefiBatchData(bridgeCallData);
    if (batchData?.isFastTrack) return 'Next Batch';
    return 'Average Wait';
  },
  skeletonSizingContent: '~12 hours',
  useFormattedValue: recipe => {
    const rpStatus = useRollupProviderStatus();
    const bridgeCallData = useDefaultEnterBridgeCallData(recipe);
    const batchData = useDefiBatchData(bridgeCallData);
    const batchAverageTimeout = useDefiBatchAverageTimeout(recipe, bridgeCallData);
    if (batchData?.isFastTrack) {
      const { nextSettlementTime } = estimateTxSettlementTimes(rpStatus);
      if (!nextSettlementTime) return;
      return moment(nextSettlementTime).fromNow(true);
    } else {
      if (batchAverageTimeout === undefined) return undefined;
      if (batchAverageTimeout === 0) return 'TBD';
      return moment.duration(batchAverageTimeout * 1000).humanize();
    }
  },
};

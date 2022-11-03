import { formatBulkPrice_compact, formatPercentage_2dp } from '../../app/util/formatters.js';
import { useDefaultEnterCountDownData } from '../../features/defi/bridge_count_down/bridge_count_down_hooks.js';
import moment from 'moment';
import { useDefaultExpectedAssetYield, useDefaultLiquidity } from './defi_info_hooks.js';
import { KeyStatConfig } from './types.js';

export const keyStatConfig_liquidity: KeyStatConfig = {
  label: 'L1 Liquidity',
  skeletonSizingContent: '$11B',
  useFormattedValue: recipe => {
    const liquidity = useDefaultLiquidity(recipe.id);
    if (liquidity === undefined) return;
    return formatBulkPrice_compact(liquidity);
  },
};

export const keyStatConfig_apr: KeyStatConfig = {
  label: 'APR',
  skeletonSizingContent: '2.34%',
  useFormattedValue: recipe => {
    const apr = useDefaultExpectedAssetYield(recipe);
    if (apr === undefined) return;
    return formatPercentage_2dp(apr);
  },
};

export const keyStatConfig_nextBatch: KeyStatConfig = {
  label: 'Next Batch',
  skeletonSizingContent: '~12 hours',
  useFormattedValue: recipe => {
    const data = useDefaultEnterCountDownData(recipe);
    if (data?.nextBatch === undefined) return undefined;
    return `~${moment(data.nextBatch).fromNow(true)}`;
  },
};

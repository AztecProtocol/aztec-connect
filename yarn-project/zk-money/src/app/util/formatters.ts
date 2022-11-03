import { baseUnitsToFloat, PRICE_DECIMALS } from '../units.js';

const percentageFormatter_2dp = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 });

export function formatPercentage_2dp(percentage: number) {
  return percentageFormatter_2dp.format(percentage / 100);
}

const percentageFormatter_1dp = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

export function formatPercentage_1dp(percentage: number) {
  return percentageFormatter_1dp.format(percentage / 100);
}

const numberFormatter_compact = new Intl.NumberFormat('en-GB', { notation: 'compact' });

export function formatBulkPrice_compact(bulkPrice: bigint) {
  return '$' + numberFormatter_compact.format(baseUnitsToFloat(bulkPrice, PRICE_DECIMALS));
}

const dateFormatter_short = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

export function formatDate_short(time: number | Date) {
  return dateFormatter_short.format(time);
}

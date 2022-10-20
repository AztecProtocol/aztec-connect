export const min = (...values: bigint[]) => values.reduce((minValue, v) => (minValue <= v ? minValue : v), values[0]!);
export const max = (...values: bigint[]) => values.reduce((maxValue, v) => (maxValue >= v ? maxValue : v), values[0]!);
export const sum = (values: bigint[]) => values.reduce((sum, v) => sum + v, 0n);

export const tenTo = (power: number) => BigInt('1'.padEnd(power + 1, '0'));

export const fromBaseUnits = (value: bigint, decimals: number) => {
  const neg = value < 0n;
  const valStr = value
    .toString()
    .slice(neg ? 1 : 0)
    .padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  const fractional = valStr.slice(-decimals).replace(/0{1,}$/, '');
  const result = (neg ? '-' : '') + (fractional ? `${integer}.${fractional}` : integer);
  return result;
};

export const toBaseUnits = (valueString: string, decimals: number) => {
  const [integer, decimal] = valueString.split('.');
  const fractional = (decimal || '').replace(/0+$/, '').slice(0, decimals);
  const scalingFactor = tenTo(decimals);
  const fractionalScale = scalingFactor / tenTo(fractional.length || 0);
  return BigInt(fractional || 0) * fractionalScale + BigInt(integer || 0) * scalingFactor;
};

export const baseUnitsToFloat = (value: bigint, divisorExponent: number) => {
  return Number(`${value}E${-divisorExponent}`);
};

export const formatBaseUnits = (
  value: bigint,
  decimals: number,
  opts?: { precision?: number; commaSeparated?: boolean; showPlus?: boolean; floor?: boolean },
) => {
  if (opts?.floor && opts.precision !== undefined) {
    value -= value % tenTo(decimals - opts.precision);
  }
  // Precision is lost in converting a BigInt to a number, but if the precision lost makes it into the digits displayed
  // then we've got bigger problems anyway, such as fitting such a long string in the UI.
  return new Intl.NumberFormat('en-GB', {
    useGrouping: opts?.commaSeparated ?? false,
    maximumFractionDigits: opts?.precision ?? 20,
    minimumFractionDigits: opts?.precision,
    signDisplay: opts?.showPlus ? 'exceptZero' : undefined,
  }).format(baseUnitsToFloat(value, decimals));
};

export const convertToBulkPrice = (value: bigint, decimals: number, unitPriceBaseUnits: bigint) =>
  (value * unitPriceBaseUnits) / tenTo(decimals);

export const PRICE_DECIMALS = 8;

export const formatValueAsBulkPrice = (
  value: bigint,
  valueDecimals: number,
  unitPriceBaseUnits: bigint,
  priceDecimals = PRICE_DECIMALS,
  precision = 2,
) =>
  formatBaseUnits(convertToBulkPrice(value, valueDecimals, unitPriceBaseUnits), priceDecimals, {
    precision,
    commaSeparated: true,
  });

export const formatBulkPrice = (baseUnits: bigint, priceDecimals = PRICE_DECIMALS, precision = 2) =>
  formatBaseUnits(baseUnits, priceDecimals, { precision, commaSeparated: true });

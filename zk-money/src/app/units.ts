export const min = (...values: bigint[]) => values.reduce((minValue, v) => (minValue <= v ? minValue : v), values[0]);
export const max = (...values: bigint[]) => values.reduce((maxValue, v) => (maxValue >= v ? maxValue : v), values[0]);
export const sum = (values: bigint[]) => values.reduce((sum, v) => sum + v, 0n);

const tenTo = (power: number) => BigInt('1'.padEnd(power + 1, '0'));

export const fromBaseUnits = (value: bigint, decimals: number) => {
  const neg = value < 0n;
  const valStr = value
    .toString()
    .slice(neg ? 1 : 0)
    .padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  const fractional = valStr.slice(-decimals).replace(/0{1,}$/, '');
  return (neg ? '-' : '') + (fractional ? `${integer}.${fractional}` : integer);
};

export const toBaseUnits = (valueString: string, decimals: number) => {
  const [integer, decimal] = valueString.split('.');
  const fractional = (decimal || '').replace(/0+$/, '').slice(0, decimals);
  const scalingFactor = tenTo(decimals);
  const fractionalScale = scalingFactor / tenTo(fractional.length || 0);
  return BigInt(fractional || 0) * fractionalScale + BigInt(integer || 0) * scalingFactor;
};

const baseUnitsToFloat = (value: bigint, divisorExponent: number) => {
  const divisor = Math.pow(10, divisorExponent);
  const bigIntDivsor = BigInt(divisor);
  const whole = Number(value / bigIntDivsor);
  const fractional = Number(value % bigIntDivsor) / divisor;
  return whole + fractional;
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
    maximumFractionDigits: opts?.precision,
    minimumFractionDigits: opts?.precision,
    signDisplay: opts?.showPlus ? 'exceptZero' : undefined,
  }).format(baseUnitsToFloat(value, decimals));
};

export const convertToPrice = (value: bigint, decimals: number, priceBaseUnits: bigint) =>
  (value * priceBaseUnits) / tenTo(decimals);

export const convertToPriceString = (
  value: bigint,
  decimals: number,
  priceBaseUnits: bigint,
  priceDecimals = 8,
  precision = 2,
) =>
  formatBaseUnits(convertToPrice(value, decimals, priceBaseUnits), priceDecimals, { precision, commaSeparated: true });

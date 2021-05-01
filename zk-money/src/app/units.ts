export const min = (...values: bigint[]) => values.reduce((minValue, v) => (minValue <= v ? minValue : v), values[0]);
export const max = (...values: bigint[]) => values.reduce((maxValue, v) => (maxValue >= v ? maxValue : v), values[0]);
export const sum = (values: bigint[]) => values.reduce((sum, v) => sum + v, 0n);

const tenTo = (power: number) => BigInt('1'.padEnd(power + 1, '0'));

export const fromBaseUnits = (value: bigint, decimals: number, precision?: number) => {
  const neg = value < 0n;
  const valStr = value
    .toString()
    .slice(neg ? 1 : 0)
    .padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  let fractional = valStr.slice(-decimals);
  if (precision === undefined) {
    fractional = fractional.replace(/0{1,}$/, '');
  } else if (!precision) {
    fractional = '';
  }
  return (neg ? '-' : '') + (fractional ? `${integer}.${fractional.slice(0, precision)}` : integer);
};

export const toBaseUnits = (valueString: string, decimals: number) => {
  const [integer, decimal] = valueString.split('.');
  const fractional = (decimal || '').replace(/0+$/, '').slice(0, decimals);
  const scalingFactor = tenTo(decimals);
  const fractionalScale = scalingFactor / tenTo(fractional.length || 0);
  return BigInt(fractional || 0) * fractionalScale + BigInt(integer || 0) * scalingFactor;
};

export const convertToPrice = (value: bigint, decimals: number, priceBaseUnits: bigint) =>
  (value * priceBaseUnits) / tenTo(decimals);

export const convertToPriceString = (
  value: bigint,
  decimals: number,
  priceBaseUnits: bigint,
  priceDecimals = 8,
  precision = 2,
) => fromBaseUnits(convertToPrice(value, decimals, priceBaseUnits), priceDecimals, precision);

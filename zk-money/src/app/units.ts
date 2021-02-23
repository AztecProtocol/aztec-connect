export const min = (v0: bigint, v1: bigint) => (v0 <= v1 ? v0 : v1);
export const max = (v0: bigint, v1: bigint) => (v0 >= v1 ? v0 : v1);
export const sum = (values: bigint[]) => values.reduce((sum, v) => sum + v, 0n);

export function fromBaseUnits(value: bigint, decimals: number, precision?: number) {
  const neg = value < 0n;
  const valStr = value
    .toString()
    .slice(neg ? 1 : 0)
    .padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  let fractional = valStr.slice(-decimals);
  if (precision === undefined) {
    fractional = fractional.replace(/0{1,}$/, '');
  }
  return (neg ? '-' : '') + (fractional ? `${integer}.${fractional.slice(0, precision)}` : integer);
}

export function toBaseUnits(valueString: string, decimals: number) {
  const [integer, decimal] = valueString.split('.');
  const fractional = (decimal || '').replace(/0+$/, '').slice(0, decimals);
  const scalingFactor = BigInt('1'.padEnd(decimals + 1, '0'));
  const fractionalScale = scalingFactor / BigInt('1'.padEnd((fractional.length || 0) + 1, '0'));
  return BigInt(fractional || 0) * fractionalScale + BigInt(integer || 0) * scalingFactor;
}

export const formatValueString = (valueString: string, precision?: number) => {
  return fromBaseUnits(toBaseUnits(valueString, 100), 100, precision);
};

/**
 * Converts the value to a decimal string representation with the given precision.
 * The digits outside the precision are simply discarded (i.e. the result is floored).
 * This ensures we never report more funds than actually exists.
 * @param value to convert to string
 * @param decimals the number of least significant digits of value that represent the decimal
 * @param precision the number of decimal places to return
 */
export function fromErc20Units(value: bigint, decimals: number, precision: number = decimals) {
  const valStr = value.toString().padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  const fractional = valStr.slice(-decimals);
  return fractional ? `${integer}.${fractional.slice(0, precision)}` : integer;
}

/**
 * Converts the value from a decimal string to bigint token value.
 * @param valueString to convert to bigint
 * @param decimals the number of least significant digits of value that represent the decimal
 */
export function toErc20Units(valueString: string, decimals: number) {
  const [integer, decimal] = valueString.split('.');
  const fractional = (decimal || '').replace(/0+$/, '').slice(0, decimals);
  const scalingFactor = BigInt(10) ** BigInt(decimals);
  const fractionalScale = scalingFactor / BigInt(10) ** BigInt(fractional.length || 0);
  return BigInt(fractional || 0) * fractionalScale + BigInt(integer || 0) * scalingFactor;
}

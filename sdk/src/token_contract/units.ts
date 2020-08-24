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

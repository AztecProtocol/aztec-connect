export const roundUp = (value: bigint, numSignificantFigures: number) => {
  if (numSignificantFigures < 0) {
    throw new Error('Number of significant figures cannot be negative.');
  }

  if (!numSignificantFigures) {
    return value;
  }

  const numDigits = `${value}`.length;
  const numZeros = Math.max(0, numDigits - numSignificantFigures);
  const exp = 10n ** BigInt(numZeros);
  const head = value / exp;
  const carry = numZeros && value % exp >= exp / 10n ? 1n : 0n;
  return (head + carry) * exp;
};

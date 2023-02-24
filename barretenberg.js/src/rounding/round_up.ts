export const roundUp = (value: bigint, numSignificantFigures: number) => {
  if (numSignificantFigures < 0) {
    throw new Error('Number of significant figures cannot be negative.');
  }

  if (!numSignificantFigures) {
    return value;
  }

  const numDigits = `${value}`.length;
  const numZeros = Math.max(0, numDigits - numSignificantFigures);
  const exp = BigInt(10) ** BigInt(numZeros);
  const head = value / exp;
  const carry = numZeros && value % exp ? BigInt(1) : BigInt(0);
  return (head + carry) * exp;
};

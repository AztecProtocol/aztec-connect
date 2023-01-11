import { roundUp } from './round_up.js';

describe('round_up', () => {
  it('round up big integers', () => {
    expect(roundUp(123n, 0)).toBe(123n);
    expect(roundUp(123n, 1)).toBe(200n);
    expect(roundUp(123n, 2)).toBe(130n);
    expect(roundUp(123n, 3)).toBe(123n);
    expect(roundUp(123n, 4)).toBe(123n);

    expect(roundUp(999n, 0)).toBe(999n);
    expect(roundUp(999n, 1)).toBe(1000n);
    expect(roundUp(999n, 2)).toBe(1000n);
    expect(roundUp(999n, 3)).toBe(999n);

    expect(roundUp(1111111111111n, 1)).toBe(2000000000000n);
    expect(roundUp(1111111111111n, 2)).toBe(1200000000000n);
    expect(roundUp(1111111111111n, 3)).toBe(1120000000000n);
    expect(roundUp(1111111111111n, 4)).toBe(1112000000000n);
    expect(roundUp(1111111111111n, 5)).toBe(1111200000000n);
    expect(roundUp(1111111111111n, 6)).toBe(1111120000000n);
    expect(roundUp(1111111111111n, 7)).toBe(1111112000000n);
    expect(roundUp(1111111111111n, 8)).toBe(1111111200000n);
    expect(roundUp(1111111111111n, 9)).toBe(1111111120000n);
    expect(roundUp(1111111111111n, 10)).toBe(1111111112000n);
    expect(roundUp(1111111111111n, 11)).toBe(1111111111200n);

    expect(roundUp(110000000001n, 1)).toBe(200000000000n);
    expect(roundUp(110000000001n, 2)).toBe(120000000000n);
    expect(roundUp(110000000001n, 3)).toBe(111000000000n);
    expect(roundUp(110000000001n, 4)).toBe(110100000000n);
    expect(roundUp(110000000001n, 5)).toBe(110010000000n);
    expect(roundUp(110000000001n, 6)).toBe(110001000000n);
    expect(roundUp(110000000001n, 7)).toBe(110000100000n);
    expect(roundUp(110000000001n, 8)).toBe(110000010000n);
    expect(roundUp(110000000001n, 9)).toBe(110000001000n);
    expect(roundUp(110000000001n, 10)).toBe(110000000100n);
    expect(roundUp(110000000001n, 11)).toBe(110000000010n);

    expect(roundUp(990000000001n, 1)).toBe(1000000000000n);
    expect(roundUp(990000000001n, 2)).toBe(1000000000000n);
    expect(roundUp(990000000001n, 3)).toBe(991000000000n);
    expect(roundUp(990000000001n, 4)).toBe(990100000000n);
    expect(roundUp(990000000001n, 5)).toBe(990010000000n);
    expect(roundUp(990000000001n, 6)).toBe(990001000000n);
    expect(roundUp(990000000001n, 7)).toBe(990000100000n);
    expect(roundUp(990000000001n, 8)).toBe(990000010000n);
    expect(roundUp(990000000001n, 9)).toBe(990000001000n);
    expect(roundUp(990000000001n, 10)).toBe(990000000100n);
    expect(roundUp(990000000001n, 11)).toBe(990000000010n);
  });

  it('throw if number of significant figures is negative', () => {
    expect(() => roundUp(123n, -1)).toThrow();
  });

  it('never rounds down', () => {
    // generate 10 random numbers and iterate through them
    for (let i = 0; i < 1000; i++) {
      const randomBigInt = BigInt(Math.floor(Math.random() * 1000000000000));
      // generate random number where max number is lenght of randomBigInt converted to string
      const numSignificantFigures = Math.floor(Math.random() * randomBigInt.toString().length);
      // round the integer
      const roundedBigInt = roundUp(randomBigInt, numSignificantFigures);
      // check if rounded num is greater than or equal to num
      expect(roundedBigInt).toBeGreaterThanOrEqual(randomBigInt);
    }
  });

  it('correctly handles overflows', () => {
    // generates 10 random numbers only containg 9s and iterates through them
    for (let i = 0; i < 10; i++) {
      const randomBigInt = BigInt('9'.repeat(Math.floor(Math.random() * 20) + 2));
      // generate random number where max number is lenght of randomBigInt converted to string
      const numSignificantFigures = Math.floor(Math.random() * (randomBigInt.toString().length - 1)) + 1;
      // round the integer
      const roundedBigInt = roundUp(randomBigInt, numSignificantFigures);
      // check if rounded integer is greater than the original
      expect(roundedBigInt).toBeGreaterThan(randomBigInt);
    }
  });
});

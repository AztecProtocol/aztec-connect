import { randomInt } from './random_int';

describe('randomInt', () => {
  it('generate a random number between min(inclusive) and max(inclusive)', () => {
    const val0 = randomInt(0, 10);
    expect(val0 >= 0).toBe(true);
    expect(val0 <= 10).toBe(true);

    const val1 = randomInt(31, 32);
    expect(val1 >= 31).toBe(true);
    expect(val1 <= 32).toBe(true);

    const val2 = randomInt(10, 10);
    expect(val2).toBe(10);
  });

  it('can change order of inputs', () => {
    const val0 = randomInt(10, 0);
    expect(val0 >= 0).toBe(true);
    expect(val0 <= 10).toBe(true);
  });

  it('allow negative values', () => {
    const val0 = randomInt(-14, -7);
    expect(val0 >= -14).toBe(true);
    expect(val0 <= -7).toBe(true);

    const val1 = randomInt(-10, -10);
    expect(val1).toBe(-10);

    const val2 = randomInt(-3, 5);
    expect(val2 >= -3).toBe(true);
    expect(val2 <= 5).toBe(true);
  });

  it('set another value to be 0 if only one value is provided', () => {
    const val0 = randomInt(10);
    expect(val0 >= 0).toBe(true);
    expect(val0 <= 10).toBe(true);

    const val1 = randomInt(-2);
    expect(val1 >= -2).toBe(true);
    expect(val1 <= 0).toBe(true);

    const val2 = randomInt(0);
    expect(val2).toBe(0);
  });

  it('select a number from 0 to 2 ** 32 if no values are provided', () => {
    const val = randomInt();
    expect(val >= 0).toBe(true);
    expect(val <= 2 ** 32).toBe(true);
  });
});

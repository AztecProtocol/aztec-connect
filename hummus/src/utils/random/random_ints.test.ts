import { randomInts } from './random_ints';

describe('randomInts', () => {
  it('generate an array of sorted integers in specified range', () => {
    const result0 = randomInts(2, 0, 10);
    expect(result0.every(v => v >= 0 && v <= 10)).toBe(true);

    const result1 = randomInts(2, 0, 2);
    expect(result1.every(v => v >= 0 && v <= 2)).toBe(true);

    const result2 = randomInts(2, 0, 1);
    expect(result2).toEqual([0, 1]);

    const result3 = randomInts(3, 14, 16);
    expect(result3).toEqual([14, 15, 16]);
  });

  it('return all valid values if required number is larger than range', () => {
    const result0 = randomInts(4, 1, 1);
    expect(result0).toEqual([1]);

    const result1 = randomInts(4, 2, 3);
    expect(result1).toEqual([2, 3]);
  });

  it('accept negative range', () => {
    const result0 = randomInts(2, -10, -5);
    expect(result0.every(v => v >= -10 && v <= -5)).toBe(true);

    const result1 = randomInts(4, -12, -11);
    expect(result1).toEqual([-12, -11]);
  });

  it('the order of start and end can be switch', () => {
    const result0 = randomInts(3, 15, 13);
    expect(result0).toEqual([13, 14, 15]);

    const result1 = randomInts(3, -5, -7);
    expect(result1).toEqual([-7, -6, -5]);
  });

  it('set another side of the range to be 0 if only one value is provided', () => {
    const result0 = randomInts(3, 2);
    expect(result0).toEqual([0, 1, 2]);

    const result1 = randomInts(3, -2);
    expect(result1).toEqual([-2, -1, 0]);
  });

  it('select numbers from 0 to 2 ** 32 if no boundaries are provided', () => {
    const result = randomInts(10);
    expect(result.every(v => v >= 0 && v <= 2 ** 32)).toBe(true);
  });
});

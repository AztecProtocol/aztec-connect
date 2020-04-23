import { randomPartitions } from './random_partitions';

describe('randomPartitions', () => {
  it('generate an array of integers with specified sum and array size', () => {
    const sum = 16;
    const numberOfPartitions = 5;
    const result = randomPartitions(sum, numberOfPartitions);
    const resultSum = result.reduce((accum, v) => accum + v, 0);
    expect(result.length).toBe(numberOfPartitions);
    expect(resultSum).toBe(sum);
  });

  it('return an empty array if number of partitions is less than 1', () => {
    expect(randomPartitions(1, 0)).toEqual([]);
    expect(randomPartitions(1, -1)).toEqual([]);
  });

  it('return sum if number of partitions is 1', () => {
    expect(randomPartitions(0, 1)).toEqual([0]);
    expect(randomPartitions(12, 1)).toEqual([12]);
    expect(randomPartitions(123, 1)).toEqual([123]);
  });

  it('return an array of zeros if sum is zero', () => {
    expect(randomPartitions(0, 2)).toEqual([0, 0]);
    expect(randomPartitions(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });
});

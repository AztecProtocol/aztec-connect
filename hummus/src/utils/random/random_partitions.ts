import { randomInt } from './random_int';

export const randomPartitions = (sum: number, numberOfPartitions: number, rand: () => number = Math.random) => {
  if (numberOfPartitions <= 0) {
    return [];
  }

  const sumArr = [sum];
  for (let i = 0; i < numberOfPartitions - 1; i += 1) {
    const pickIdx = randomInt(0, sumArr.length - 1, rand);
    const val = sumArr[pickIdx];
    const splitVal = randomInt(0, val, rand);
    sumArr[pickIdx] = val - splitVal;
    sumArr.push(splitVal);
  }
  return sumArr;
};

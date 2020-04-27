import { randomInt } from './random_int';

const pick = (
  count: number,
  start: number,
  end: number,
  rand: () => number = Math.random,
): number[] => {
  if (count <= 0 || end < start) {
    return [];
  }

  const mid = randomInt(start, end, rand);
  if (count === 1) {
    return [mid];
  }

  const leftLen = mid - start;
  const rightLen = end - mid;
  const len = end - start;
  let leftCount = Math.round(((count - 1) * leftLen) / len);
  let rightCount = count - leftCount - 1;
  leftCount += Math.max(0, Math.max(0, rightCount - rightLen));
  rightCount += Math.max(0, Math.max(0, leftCount - leftLen));

  return [
    ...pick(leftCount, start, mid - 1, rand),
    mid,
    ...pick(rightCount, mid + 1, end, rand),
  ];
};

export const randomInts = (
  count: number,
  from?: number,
  to?: number,
  rand: () => number = Math.random,
) => {
  const pivot = to !== undefined ? (from || 0) : 0;
  let offset: number;
  if (to !== undefined) {
    offset = to - pivot;
  } else {
    offset = from !== undefined ? from : 2 ** 32;
  }
  const [start, end] = offset >= 0
    ? [pivot, pivot + offset]
    : [pivot + offset, pivot];

  return pick(count, start, end, rand);
};

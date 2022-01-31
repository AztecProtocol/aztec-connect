import { assets, toBaseUnits } from '../../../app';

const createBuckets = (assetId: number, boundCountPairs: [string, number][]) => {
  const asset = assets[assetId];
  return boundCountPairs.map(([lowerBoundStr, count]) => ({
    lowerBound: toBaseUnits(lowerBoundStr, asset.decimals),
    count,
  }));
};

// Stats taken from https://dune.xyz/flashback/Aztec-2
// Last updated: 10th Dec 2021
export const depositorBucketGroups = [
  createBuckets(0, [
    ['0.01', 16389],
    ['0.1', 3258],
    ['1', 1204],
    ['5', 240],
    ['10', 137],
    ['30', 40],
  ]),
  createBuckets(1, [
    ['200', 250],
    ['2000', 156],
    ['20000', 49],
    ['100000', 23],
  ]),
  createBuckets(2, [
    ['0.01', 16],
    ['0.1', 14],
    ['1', 8],
    ['2', 5],
  ]),
];

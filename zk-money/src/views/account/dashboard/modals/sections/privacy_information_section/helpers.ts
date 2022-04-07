import type { RemoteAsset } from 'alt-model/types';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from 'alt-model/known_assets/known_asset_addresses';
import { toBaseUnits } from 'app';
import { EthAddress } from '@aztec/sdk';
import { useRemoteAssets } from 'alt-model/top_level_context';
import { useMemo } from 'react';

export interface Bucket {
  lowerBound: bigint;
  count: number;
}

const createBuckets = (asset: RemoteAsset): Bucket[] => {
  const boundCountPairs = BUCKETS_STR_PAIRS[asset.address.toString()];
  return boundCountPairs?.map(([lowerBoundStr, count]) => ({
    lowerBound: toBaseUnits(lowerBoundStr, asset.decimals),
    count,
  }));
};

// Stats taken from https://dune.xyz/flashback/Aztec-2
// Last updated: 10th Dec 2021
const BUCKETS_STR_PAIRS: Record<string, [string, number][]> = {
  [S.ETH]: [
    ['0.01', 16389],
    ['0.1', 3258],
    ['1', 1204],
    ['5', 240],
    ['10', 137],
    ['30', 40],
  ],
  [S.DAI]: [
    ['200', 250],
    ['2000', 156],
    ['20000', 49],
    ['100000', 23],
  ],
  [S.renBTC]: [
    ['0.01', 16],
    ['0.1', 14],
    ['1', 8],
    ['2', 5],
  ],
};

export function useDepositorBuckets(address: EthAddress) {
  const asset = useRemoteAssets()?.find(x => x.address.equals(address));
  return useMemo(() => asset && createBuckets(asset), [asset]);
}

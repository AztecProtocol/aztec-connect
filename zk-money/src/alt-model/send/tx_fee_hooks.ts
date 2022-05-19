import type { AssetValue, TxType } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useSdk } from 'alt-model/top_level_context';
import { createGatedSetter, listenPoll } from 'app/util';
import { useAmounts } from '../asset_hooks';
import { normaliseFeeForPrivacy } from '../forms/fee_helpers';

const FEE_POLL_INTERVAL = 1000 * 60 * 5;

export function useTxFeeAmounts(assetId: number, txType: TxType | undefined) {
  const sdk = useSdk();
  const [feeGroups, setFeeGroups] = useState<AssetValue[][]>();
  useEffect(() => {
    if (sdk) {
      const gatedSetter = createGatedSetter(setFeeGroups);
      const unlisten = listenPoll(async () => {
        const unnormalisedFeeGroups = await sdk.getTxFees(assetId);
        const feeGroups = unnormalisedFeeGroups.map(group => group.map(normaliseFeeForPrivacy));
        gatedSetter.set(feeGroups);
      }, FEE_POLL_INTERVAL);
      return () => {
        gatedSetter.close();
        unlisten();
      };
    }
  }, [sdk, assetId]);
  const fees = txType !== undefined ? feeGroups?.[txType] : undefined;
  return useAmounts(fees);
}

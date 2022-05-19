import { useEffect, useState } from 'react';
import { AssetValue } from '@aztec/sdk';
import { useSdk } from 'alt-model/top_level_context';
import { createGatedSetter, listenPoll } from 'app/util';
import { useAmounts } from '../asset_hooks';
import { normaliseFeeForPrivacy } from '../forms/fee_helpers';

const POLL_INTERVAL = 1000 * 60 * 5;

export function useDepositFeeAmounts(assetId: number) {
  const sdk = useSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    if (sdk) {
      const gatedSetter = createGatedSetter(setFees);
      const unlisten = listenPoll(async () => {
        const unnormalisedFees = await sdk.getDepositFees(assetId);
        const fees = unnormalisedFees.map(normaliseFeeForPrivacy);
        gatedSetter.set(fees);
      }, POLL_INTERVAL);
      return () => {
        gatedSetter.close();
        unlisten();
      };
    }
  }, [sdk, assetId]);
  return useAmounts(fees);
}

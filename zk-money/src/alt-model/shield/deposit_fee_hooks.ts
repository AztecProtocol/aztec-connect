import { useMemo } from 'react';
import { useSdk } from 'alt-model/top_level_context';
import { useAmounts } from '../asset_hooks';
import { normaliseFeeForPrivacy } from '../forms/fee_helpers';
import { usePolledCallback } from 'app/util/polling_hooks';

const POLL_INTERVAL = 1000 * 60 * 5;

export function useDepositFeeAmounts(assetId: number) {
  const sdk = useSdk();
  const poll = useMemo(() => {
    if (!sdk) return;
    return async () => {
      const unnormalisedFees = await sdk.getDepositFees(assetId);
      return unnormalisedFees.map(normaliseFeeForPrivacy);
    };
  }, [sdk, assetId]);
  const fees = usePolledCallback(poll, POLL_INTERVAL);
  return useAmounts(fees);
}

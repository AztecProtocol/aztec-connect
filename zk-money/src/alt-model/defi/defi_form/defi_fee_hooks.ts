import type { BridgeId } from '@aztec/sdk';
import { useAmounts, useSdk } from 'alt-model/top_level_context';
import { useMemo } from 'react';
import { normaliseFeeForPrivacy } from 'alt-model/forms/fee_helpers';
import { usePolledCallback } from 'app/util/polling_hooks';

const POLL_INTERVAL = 1000 * 60 * 10;

export function useDefiFeeAmounts(bridgeId: BridgeId | undefined) {
  const sdk = useSdk();
  const poll = useMemo(() => {
    if (!sdk || !bridgeId) return;
    return async () => {
      const unnormalisedFees = await sdk.getDefiFees(bridgeId);
      return unnormalisedFees.map(normaliseFeeForPrivacy);
    };
  }, [sdk, bridgeId]);
  const fees = usePolledCallback(poll, POLL_INTERVAL);
  return useAmounts(fees);
}

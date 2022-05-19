import type { AssetValue, BridgeId } from '@aztec/sdk';
import { createGatedSetter, listenPoll } from 'app/util';
import { useAmounts, useSdk } from 'alt-model/top_level_context';
import { useEffect, useState } from 'react';
import { normaliseFeeForPrivacy } from 'alt-model/forms/fee_helpers';

const POLL_INTERVAL = 1000 * 60 * 10;

export function useDefiFeeAmounts(bridgeId: BridgeId | undefined) {
  const sdk = useSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    setFees(undefined);
    if (sdk && bridgeId) {
      const gatedSetter = createGatedSetter(setFees);
      const unlisten = listenPoll(async () => {
        const unnormalisedFees = await sdk.getDefiFees(bridgeId);
        const fees = unnormalisedFees.map(normaliseFeeForPrivacy);
        gatedSetter.set(fees);
      }, POLL_INTERVAL);
      return () => {
        gatedSetter.close();
        unlisten();
      };
    }
  }, [sdk, bridgeId]);
  return useAmounts(fees);
}

import type { AssetValue, BridgeId } from '@aztec/sdk';
import { useAmounts, useSdk } from 'alt-model/top_level_context';
import { useEffect, useState } from 'react';

export function useDefiFeeAmounts(bridgeId: BridgeId | undefined) {
  const sdk = useSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    if (bridgeId) {
      sdk?.getDefiFees(bridgeId).then(setFees);
    }
  }, [sdk, bridgeId]);
  return useAmounts(fees);
}

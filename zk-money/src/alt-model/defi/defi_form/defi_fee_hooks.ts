import type { AssetValue, BridgeId } from '@aztec/sdk';
import { gateSetter } from 'app/util';
import { useAmounts, useSdk } from 'alt-model/top_level_context';
import { useEffect, useState } from 'react';

export function useDefiFeeAmounts(bridgeId: BridgeId | undefined) {
  const sdk = useSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    const gatedSetter = gateSetter(setFees);
    gatedSetter.set(undefined);
    if (bridgeId) sdk?.getDefiFees(bridgeId).then(gatedSetter.set);
    return gatedSetter.close;
  }, [sdk, bridgeId]);
  return useAmounts(fees);
}

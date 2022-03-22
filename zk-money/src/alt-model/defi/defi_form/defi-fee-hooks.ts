import type { AssetValue, BridgeId, DefiSettlementTime } from '@aztec/sdk';
import { useAmount, useInitialisedSdk } from 'alt-model/top_level_context';
import { useEffect, useState } from 'react';

export function useDefiFeeAmount(bridgeId: BridgeId, speed: DefiSettlementTime) {
  const sdk = useInitialisedSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    sdk?.getDefiFees(bridgeId).then(setFees);
  }, [sdk, bridgeId]);
  return useAmount(fees?.[speed]);
}

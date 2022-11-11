import { BridgeCallData, DefiSettlementTime } from '@aztec/sdk';
import { useSdk } from '../../../alt-model/top_level_context/index.js';
import { useMemo } from 'react';
import { FEE_SIG_FIGURES } from '../../../alt-model/forms/constants.js';
import { useSpendableBalance } from '../../../alt-model/balance_hooks.js';
import { usePolledCallback } from '../../../app/util/polling_hooks.js';
import { useAccountState } from '../../account_state/index.js';

const POLL_INTERVAL = 1000 * 60;

export function useMaxDefiValue(bridgeCallData: BridgeCallData | undefined, speed: DefiSettlementTime) {
  useSdk();
  const sdk = useSdk();
  const accountState = useAccountState();
  const userId = accountState?.userId;
  const spendableBalanceA = useSpendableBalance(bridgeCallData?.inputAssetIdA);
  const spendableBalanceB = useSpendableBalance(bridgeCallData?.inputAssetIdB);
  const poll = useMemo(() => {
    if (spendableBalanceA || spendableBalanceB) {
      // An arbitrary usage of spendableBalance to appease the linter. A change
      // in this value implies that the structure of the user's notes has
      // changed, and the fee for chaining may have changed too. Hence why it's
      // included as a dependency to trigger a refetch.
    }
    if (!sdk || !userId || !bridgeCallData) return;
    return async () => {
      const { fee, ...assetValue } = await sdk.getMaxDefiValue(userId, bridgeCallData, {
        userSpendingKeyRequired: true,
        txSettlementTime: speed,
        feeSignificantFigures: FEE_SIG_FIGURES,
      });
      return assetValue;
    };
  }, [bridgeCallData, speed, sdk, userId, spendableBalanceA, spendableBalanceB]);
  return usePolledCallback(poll, POLL_INTERVAL);
}

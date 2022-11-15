import { useMemo } from 'react';
import type { AssetValue, BridgeCallData } from '@aztec/sdk';
import { useAmounts, useSdk } from '../../../alt-model/top_level_context/index.js';
import { usePolledCallback } from '../../../app/util/polling_hooks.js';
import { useSpendableBalance } from '../../../alt-model/balance_hooks.js';
import { useAccountState } from '../../account_state/account_state_hooks.js';
import { FEE_SIG_FIGURES } from '../../forms/constants.js';

const POLL_INTERVAL = 1000 * 60;

export function useDefiFeeAmounts(bridgeCallData: BridgeCallData | undefined, deposit: AssetValue | undefined) {
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
    if (!sdk || !bridgeCallData || deposit?.assetId === undefined || deposit?.value === undefined) return;
    return () =>
      sdk.getDefiFees(bridgeCallData, {
        userId,
        userSpendingKeyRequired: true,
        excludePendingNotes: false,
        feeSignificantFigures: FEE_SIG_FIGURES,
        // Appease linter - We repack the assetValue because it's not a stable reference
        assetValue: { assetId: deposit.assetId, value: deposit.value },
      });
  }, [sdk, bridgeCallData, userId, deposit?.assetId, deposit?.value, spendableBalanceA, spendableBalanceB]);
  const fees = usePolledCallback(poll, POLL_INTERVAL);
  return useAmounts(fees);
}

import { useMemo } from 'react';
import { useSdk } from 'alt-model/top_level_context';
import { useAmounts } from '../asset_hooks';
import { usePolledCallback } from 'app/util/polling_hooks';
import { FEE_SIG_FIGURES } from 'alt-model/forms/constants';

const POLL_INTERVAL = 1000 * 60;

export function useDepositFeeAmounts(assetId: number) {
  const sdk = useSdk();
  const poll = useMemo(() => {
    if (!sdk) return;
    return async () => sdk.getDepositFees(assetId, { feeSignificantFigures: FEE_SIG_FIGURES });
  }, [sdk, assetId]);
  const fees = usePolledCallback(poll, POLL_INTERVAL);
  return useAmounts(fees);
}

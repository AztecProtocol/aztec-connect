import { useMemo } from 'react';
import { useSdk } from '../top_level_context/index.js';
import { useAmounts } from '../asset_hooks.js';
import { usePolledCallback } from '../../app/util/polling_hooks.js';
import { FEE_SIG_FIGURES } from '../forms/constants.js';

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

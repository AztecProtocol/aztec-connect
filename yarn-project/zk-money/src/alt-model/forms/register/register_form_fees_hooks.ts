import { useCallback } from 'react';
import { usePolledCallback } from '../../../app/util/polling_hooks.js';
import { useAmounts } from '../../asset_hooks.js';
import { useSdk } from '../../top_level_context/top_level_context_hooks.js';
import { FEE_SIG_FIGURES } from '../constants.js';

const POLL_INTERVAL = 1000 * 60;

export function useRegistrationFeeAmounts(assetId: number) {
  const sdk = useSdk();
  const pollRegistrationFees = useCallback(
    async () => sdk?.getRegisterFees(assetId, { feeSignificantFigures: FEE_SIG_FIGURES }),
    [assetId, sdk],
  );
  const fees = usePolledCallback(pollRegistrationFees, POLL_INTERVAL);
  return useAmounts(fees);
}

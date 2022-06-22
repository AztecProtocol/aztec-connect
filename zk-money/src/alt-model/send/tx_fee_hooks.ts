import type { EthAddress } from '@aztec/sdk';
import { useMemo } from 'react';
import { useSdk } from 'alt-model/top_level_context';
import { useAmounts } from '../asset_hooks';
import { normaliseFeeForPrivacy } from '../forms/fee_helpers';
import { usePolledCallback } from 'app/util/polling_hooks';

const FEE_POLL_INTERVAL = 1000 * 60 * 5;

export function useWithdrawFeeAmounts(assetId: number, address: EthAddress | undefined) {
  const sdk = useSdk();
  const poll = useMemo(() => {
    if (!sdk) return;
    return async () => {
      const unnormalisedFees = await sdk.getWithdrawFees(assetId, address);
      return unnormalisedFees.map(normaliseFeeForPrivacy);
    };
  }, [sdk, assetId, address]);
  const fees = usePolledCallback(poll, FEE_POLL_INTERVAL);
  return useAmounts(fees);
}

export function useTransferFeeAmounts(assetId: number) {
  const sdk = useSdk();
  const poll = useMemo(() => {
    if (!sdk) return;
    return async () => {
      const unnormalisedFees = await sdk.getTransferFees(assetId);
      return unnormalisedFees.map(normaliseFeeForPrivacy);
    };
  }, [sdk, assetId]);
  const fees = usePolledCallback(poll, FEE_POLL_INTERVAL);
  return useAmounts(fees);
}

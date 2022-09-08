import type { AssetValue, AztecSdk, EthAddress, GrumpkinAddress } from '@aztec/sdk';
import { useMemo } from 'react';
import { useSdk } from 'alt-model/top_level_context';
import { useAmounts } from '../asset_hooks';
import { usePolledCallback } from 'app/util/polling_hooks';
import { useApp } from 'alt-model/app_context';
import { FEE_SIG_FIGURES } from 'alt-model/forms/constants';
import { SendMode } from './send_mode';
import { useSpendableBalance } from 'alt-model/balance_hooks';

const FEE_POLL_INTERVAL = 1000 * 60;

function createFeesGetter(
  sendMode: SendMode,
  sdk: AztecSdk,
  userId: GrumpkinAddress,
  assetValue: AssetValue,
  recipient: EthAddress | undefined,
) {
  switch (sendMode) {
    case SendMode.WIDTHDRAW:
      return () =>
        sdk.getWithdrawFees(assetValue.assetId, {
          userId,
          userSpendingKeyRequired: true,
          excludePendingNotes: false,
          feeSignificantFigures: FEE_SIG_FIGURES,
          assetValue,
          recipient,
        });
    case SendMode.SEND:
      return () =>
        sdk.getTransferFees(assetValue.assetId, {
          userId,
          userSpendingKeyRequired: true,
          excludePendingNotes: false,
          feeSignificantFigures: FEE_SIG_FIGURES,
          assetValue,
        });
  }
}

export function useSendFeeAmounts(
  sendMode: SendMode,
  assetValue: AssetValue | undefined,
  recipient: EthAddress | undefined,
) {
  useSdk();
  const sdk = useSdk();
  const { userId } = useApp();
  const spendableBalance = useSpendableBalance(assetValue?.assetId);
  const poll = useMemo(() => {
    if (spendableBalance) {
      // An arbitrary usage of spendableBalance to appease the linter. A change
      // in this value implies that the structure of the user's notes has
      // changed, and the fee for chaining may have changed too. Hence why it's
      // included as a dependency to trigger a refetch.
    }
    if (!sdk || !userId || assetValue?.assetId === undefined || assetValue.value === undefined) return;
    return createFeesGetter(
      sendMode,
      sdk,
      userId,
      // Appease linter - We repack the assetValue because it's not a stable reference
      { assetId: assetValue.assetId, value: assetValue.value },
      recipient,
    );
  }, [sendMode, sdk, userId, assetValue?.assetId, assetValue?.value, recipient, spendableBalance]);
  const fees = usePolledCallback(poll, FEE_POLL_INTERVAL);
  return useAmounts(fees);
}

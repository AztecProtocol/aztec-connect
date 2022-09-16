import { AztecSdk, EthAddress, GrumpkinAddress, TxSettlementTime } from '@aztec/sdk';
import { useSdk } from 'alt-model/top_level_context';
import { useMemo } from 'react';
import { useApp } from 'alt-model/app_context';
import { FEE_SIG_FIGURES } from 'alt-model/forms/constants';
import { SendMode } from './send_mode';
import { useSpendableBalance } from 'alt-model/balance_hooks';
import { usePolledCallback } from 'app/util/polling_hooks';

const POLL_INTERVAL = 1000 * 60;

function createMaxGetter(
  sendMode: SendMode,
  sdk: AztecSdk,
  userId: GrumpkinAddress,
  speed: TxSettlementTime,
  assetId: number,
  recipient: EthAddress | undefined,
) {
  switch (sendMode) {
    case SendMode.WIDTHDRAW:
      return () =>
        sdk.getMaxWithdrawValue(userId, assetId, {
          userSpendingKeyRequired: true,
          txSettlementTime: speed,
          feeSignificantFigures: FEE_SIG_FIGURES,
          recipient,
        });
    case SendMode.SEND:
      return () =>
        sdk.getMaxTransferValue(userId, assetId, {
          userSpendingKeyRequired: true,
          txSettlementTime: speed,
          feeSignificantFigures: FEE_SIG_FIGURES,
        });
  }
}

export function useMaxSendValue(
  sendMode: SendMode,
  assetId: number | undefined,
  speed: TxSettlementTime,
  recipient: EthAddress | undefined,
) {
  useSdk();
  const sdk = useSdk();
  const { userId } = useApp();
  const spendableBalance = useSpendableBalance(assetId);
  const poll = useMemo(() => {
    if (spendableBalance) {
      // An arbitrary usage of spendableBalance to appease the linter. A change
      // in this value implies that the structure of the user's notes has
      // changed, and the fee for chaining may have changed too. Hence why it's
      // included as a dependency to trigger a refetch.
    }
    if (!sdk || !userId || assetId === undefined) return;
    return createMaxGetter(sendMode, sdk, userId, speed, assetId, recipient);
  }, [sendMode, sdk, userId, assetId, speed, recipient, spendableBalance]);
  return usePolledCallback(poll, POLL_INTERVAL);
}

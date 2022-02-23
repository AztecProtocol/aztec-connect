import { useState } from 'react';
import {
  useAssetPrice,
  useBalance,
  useParsedJoinSplitTxs,
  useDepositPendingShieldBalance,
  useSpendableBalance,
} from '../../../alt-model';
import { assets, sum } from '../../../app';
import { Button, Text } from '../../../components';
import { ShieldPrompt } from '../shield_prompt';
import { ValueSummary } from '../value_summary';
import { SendModal } from './send_modal';
import { ShieldModal } from './shield_modal';

export function AssetSummary({ assetId }: { assetId: number }) {
  const asset = assets[assetId];
  const assetPrice = useAssetPrice(assetId);
  const balance = useBalance(assetId);
  const spendableBalance = useSpendableBalance(assetId);
  const joinSplitTxs = useParsedJoinSplitTxs();
  const pendingTxs = joinSplitTxs.filter(tx => !tx.settled && tx.assetId === assetId);
  const pendingValue = sum(pendingTxs.map(tx => tx.balanceDiff));
  const depositPendingShieldBalance = useDepositPendingShieldBalance(assetId);
  const [showingShieldModal, setShowingShieldModal] = useState(false);
  const [showingSendModal, setShowingSendModal] = useState(false);
  return (
    <>
      <Text>{asset.symbol} Summary</Text>
      <ShieldPrompt
        asset={asset}
        balance={balance ?? 0n}
        pendingBalance={depositPendingShieldBalance ?? 0n}
        onSubmit={() => setShowingShieldModal(true)}
      />
      <ValueSummary
        title="Total"
        value={balance ?? 0n}
        price={assetPrice ?? 0n}
        pendingValue={pendingValue}
        pendingTxs={pendingTxs.length}
        asset={asset}
        isLoading={balance === undefined}
      />
      <ValueSummary
        title="Sendable Balance"
        value={spendableBalance ?? 0n}
        asset={asset}
        buttonSlot={<Button theme="white" text="Send" onClick={() => setShowingSendModal(true)} size="l" outlined />}
        isLoading={spendableBalance === undefined}
      />
      {showingShieldModal && <ShieldModal assetId={assetId} onClose={() => setShowingShieldModal(false)} />}
      {showingSendModal && <SendModal assetId={assetId} onClose={() => setShowingSendModal(false)} />}
    </>
  );
}

import { AssetValue, ProofId, UserTx } from '@aztec/sdk';
import { useAmount } from 'alt-model/asset_hooks';

function FeeField({ fee }: { fee: AssetValue }) {
  const amount = useAmount(fee);
  return <>Fee: {amount?.format({ uniform: true })}</>;
}

export function renderTransactionFeeField(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.SEND:
      if (!tx.isSender) return;
      return <FeeField fee={tx.fee} />;
    case ProofId.WITHDRAW:
    case ProofId.DEFI_DEPOSIT: {
      return <FeeField fee={tx.fee} />;
    }
  }
}

import { AssetValue, ProofId, UserTx, UserPaymentTx } from '@aztec/sdk';
import { useApp } from 'alt-model';
import { useAmount } from 'alt-model/asset_hooks';

function FeeField({ fee }: { fee: AssetValue }) {
  const amount = useAmount(fee);
  return <>Fee: {amount?.format({ uniform: true })}</>;
}

function SendFeeField({ tx }: { tx: UserPaymentTx }) {
  const { accountId } = useApp();
  if (!accountId) return <></>;
  const userIsOwner = tx.userId.equals(accountId);
  if (!userIsOwner) return <></>;
  return <FeeField fee={tx.fee} />;
}

export function renderTransactionFeeField(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.SEND:
      return <SendFeeField tx={tx} />;
    case ProofId.WITHDRAW:
      return <FeeField fee={tx.fee} />;
    case ProofId.DEFI_DEPOSIT: {
      return <FeeField fee={tx.fee} />;
    }
  }
}

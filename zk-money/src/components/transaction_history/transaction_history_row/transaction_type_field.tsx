import { ProofId, UserTx } from '@aztec/sdk';
import sendIcon from 'images/tx_type_send_icon.svg';
import defiIcon from 'images/tx_type_defi_icon.svg';
import style from './transaction_type_field.module.scss';

function getTxTypeLabel(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.DEPOSIT:
      return 'Shield';
    case ProofId.WITHDRAW:
      return 'Withdraw';
    case ProofId.SEND:
      return 'Send';
    case ProofId.ACCOUNT:
      return 'Register';
    case ProofId.DEFI_DEPOSIT:
      return 'Defi Deposit';
    case ProofId.DEFI_CLAIM: {
      if (tx.success) return 'Defi Claim';
      else return 'Defi Refund';
    }
  }
}

function getIconSrc(proofId: ProofId) {
  switch (proofId) {
    case ProofId.SEND:
      return sendIcon;
    case ProofId.DEFI_DEPOSIT:
    case ProofId.DEFI_CLAIM:
      return defiIcon;
  }
}

interface TransactionTypeFieldProps {
  tx: UserTx;
}

export function TransactionTypeField({ tx }: TransactionTypeFieldProps) {
  const iconSrc = getIconSrc(tx.proofId);
  return (
    <div className={style.root}>
      <div className={style.label}>{getTxTypeLabel(tx)}</div>
      {iconSrc && <img alt="" src={iconSrc} />}
    </div>
  );
}

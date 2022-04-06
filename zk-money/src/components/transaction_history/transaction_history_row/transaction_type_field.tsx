import { ProofId } from '@aztec/sdk';
import { UserTx } from 'alt-model/user_tx_hooks';
import sendIcon from 'images/tx_type_send_icon.svg';
import defiIcon from 'images/tx_type_defi_icon.svg';
import style from './transaction_type_field.module.scss';

function getTxTypeLabel(proofId: ProofId) {
  switch (proofId) {
    case ProofId.DEPOSIT:
      return 'Shield';
    case ProofId.WITHDRAW:
      return 'Withdraw';
    case ProofId.SEND:
      return 'Send';
    case ProofId.ACCOUNT:
      return 'Register';
    case ProofId.DEFI_DEPOSIT:
      return 'Defi';
  }
}

function getIconSrc(proofId: ProofId) {
  switch (proofId) {
    case ProofId.SEND:
      return sendIcon;
    case ProofId.DEFI_DEPOSIT:
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
      <div className={style.label}>{getTxTypeLabel(tx.proofId)}</div>
      {iconSrc && <img alt="" src={iconSrc} />}
    </div>
  );
}

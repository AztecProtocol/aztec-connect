import { DoneGradientIcon } from 'ui-components/components/icons';
import style from './transaction_complete.module.scss';

interface TransactionCompleteProps {
  onClose(): void;
}

export function TransactionComplete(props: TransactionCompleteProps) {
  return (
    <div className={style.root}>
      <DoneGradientIcon />
      <div>Transaction Confirmed!</div>
    </div>
  );
}

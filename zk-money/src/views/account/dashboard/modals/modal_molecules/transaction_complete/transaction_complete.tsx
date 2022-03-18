import { DoneGradientIcon } from 'ui-components/components/icons';
import { Spacer, Text, TextLink } from 'components';
import style from './transaction_complete.module.css';

interface TransactionCompleteProps {
  onClose(): void;
}

export function TransactionComplete(props: TransactionCompleteProps) {
  return (
    <div className={style.root}>
      <DoneGradientIcon />
      <Spacer size="m" />
      <Text color="gradient" text="Transaction Sent!" />
      <Spacer size="m" />
      <TextLink text="(Close)" onClick={props.onClose} />
    </div>
  );
}

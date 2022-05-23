import type { UserTx } from '@aztec/sdk';
import { TransactionTypeField } from './transaction_type_field';
import { TransactionTimeField } from './transaction_time_field';
import { renderTransactionValueField } from './transaction_value_field';
import { renderTransactionFeeField } from './transaction_fee_field';
import { bindStyle } from 'ui-components/util/classnames';
import style from './transaction_history_row.module.scss';

interface TransactionHistoryRowProps {
  tx: UserTx;
}

const cx = bindStyle(style);

export function TransactionHistoryRow({ tx }: TransactionHistoryRowProps) {
  return (
    <div className={style.root}>
      <div className={cx(style.segment, style.firstSegment)}>
        <TransactionTypeField tx={tx} />
      </div>
      <div className={style.separator} />
      <div className={style.segment}>
        <div className={style.value}>{renderTransactionValueField(tx)}</div>
      </div>
      <div className={style.segment}>
        <div className={style.fee}>{renderTransactionFeeField(tx)}</div>
      </div>
      <div className={style.separator} />
      <div className={style.segment}>
        <div className={style.time}>
          <TransactionTimeField tx={tx} />
        </div>
      </div>
    </div>
  );
}

import type { UserTx } from '@aztec/sdk';
import { TransactionTypeField } from './transaction_type_field';
import style from './transaction_history_row.module.scss';
import { renderTransactionValueField } from './transaction_value_field';
import { renderTransactionFeeField } from './transaction_fee_field';
import { TransactionTimeField } from './transaction_time_field';

interface TransactionHistoryRowProps {
  tx: UserTx;
}

export function TransactionHistoryRow({ tx }: TransactionHistoryRowProps) {
  return (
    <div className={style.root}>
      <div className={style.segment}>
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

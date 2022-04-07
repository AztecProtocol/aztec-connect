import type { UserTx } from 'alt-model/user_tx_hooks';
import { TransactionTypeField } from './transaction_type_field';
import style from './transaction_history_row.module.scss';
import { TransactionValueField } from './transaction_value_field';
import { renderTransactionOutputField } from './transaction_output_field';
import { renderTransactionTimeField } from './transaction_time_field';

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
        <div className={style.value}>
          <TransactionValueField tx={tx} />
        </div>
      </div>
      <div className={style.segment}>
        <div className={style.value}>{renderTransactionOutputField(tx)}</div>
      </div>
      <div className={style.separator} />
      <div className={style.segment}>
        <div className={style.time}>{renderTransactionTimeField(tx)}</div>
      </div>
    </div>
  );
}

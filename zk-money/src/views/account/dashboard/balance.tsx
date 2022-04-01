import type { DefiRecipe } from 'alt-model/defi/types';
import { useParsedAccountTxs, useParsedJoinSplitTxs } from '../../../alt-model';
import { HoldingsList } from '../../../components/holdings_list/holdings_list';
import { MyBalance } from '../../../components/my_balance';
import { ShieldMore } from '../../../components/shield_more';
import { TransactionHistory } from '../transaction_history';
import style from './balance.module.scss';

interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe, prefilledAmountStr: string) => void;
}

export function Balance(props: BalanceProps) {
  const accountTxs = useParsedAccountTxs();
  const joinSplitTxs = useParsedJoinSplitTxs();
  return (
    <div>
      <div className={style.balances}>
        <MyBalance />
        <ShieldMore />
      </div>
      <HoldingsList onOpenDefiExitModal={props.onOpenDefiExitModal} />
      <TransactionHistory accountTxs={accountTxs} joinSplitTxs={joinSplitTxs} />
    </div>
  );
}

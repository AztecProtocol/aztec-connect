import type { DefiRecipe } from 'alt-model/defi/types';
import { HoldingsList } from '../../../components/holdings_list/holdings_list';
import { MyBalance } from '../../../components/my_balance';
import { ShieldMore } from '../../../components/shield_more';
import { TransactionHistorySection } from '../../../components/transaction_history';
import style from './balance.module.scss';

interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function Balance(props: BalanceProps) {
  return (
    <div>
      <div className={style.balances}>
        <MyBalance />
        <ShieldMore />
      </div>
      <HoldingsList onOpenDefiExitModal={props.onOpenDefiExitModal} />
      <TransactionHistorySection />
    </div>
  );
}

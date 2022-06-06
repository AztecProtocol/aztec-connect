import type { DefiRecipe } from 'alt-model/defi/types';
import { useSdk } from 'alt-model/top_level_context';
import { Spinner, SpinnerTheme } from 'components';
import { HoldingsList } from '../../../components/holdings_list/holdings_list';
import { MyBalance } from '../../../components/my_balance';
import { ShieldMore } from '../../../components/shield_more';
import { TransactionHistorySection } from '../../../components/transaction_history';
import style from './balance.module.scss';

function LoadingFallback() {
  return (
    <div className={style.loadingRoot}>
      <Spinner theme={SpinnerTheme.GRADIENT} size="m" />
      Getting things ready
    </div>
  );
}

interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function Balance(props: BalanceProps) {
  const isLoading = !useSdk();
  if (isLoading) return <LoadingFallback />;
  return (
    <div className={style.balanceWrapper}>
      <div className={style.balances}>
        <MyBalance />
        <ShieldMore />
      </div>
      <HoldingsList onOpenDefiExitModal={props.onOpenDefiExitModal} />
      <TransactionHistorySection />
    </div>
  );
}

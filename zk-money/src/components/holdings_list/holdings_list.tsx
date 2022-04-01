import type { DefiRecipe } from 'alt-model/defi/types';
import { useState } from 'react';
import { SpeedSwitch } from 'ui-components';
import { TokenList } from './token_list';
import style from './holdings_list.module.scss';
import { DefiInvestments } from 'components/defi_investments';

const VIEWS = [
  { label: 'Tokens', value: 'tokens' },
  { label: 'Yield Positions', value: 'defi-positions' },
];

type View = typeof VIEWS[number]['value'];

interface HoldingsListProps {
  onOpenDefiExitModal: (recipe: DefiRecipe, prefilledAmountStr: string) => void;
}

export function HoldingsList(props: HoldingsListProps) {
  const [view, setView] = useState<View>('tokens');

  return (
    <div className={style.holdingsListWrapper}>
      <div className={style.speedSwitchWrapper}>
        <SpeedSwitch options={VIEWS} value={view} onChangeValue={setView} />
      </div>
      <>{view === 'tokens' ? <TokenList /> : <DefiInvestments onOpenDefiExitModal={props.onOpenDefiExitModal} />}</>
    </div>
  );
}

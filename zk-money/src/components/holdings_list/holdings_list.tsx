import { useState } from 'react';
import { SpeedSwitch } from 'ui-components';
import { DefiPositionList } from './defi_position_list';
import { TokenList } from './token_list';
import style from './holdings_list.module.scss';

const VIEWS = [
  { label: 'Tokens', value: 'tokens' },
  { label: 'Yield Positions', value: 'defi-positions' },
];

type View = typeof VIEWS[number]['value'];

export function HoldingsList() {
  const [view, setView] = useState<View>('tokens');

  return (
    <div className={style.holdingsListWrapper}>
      <div className={style.speedSwitchWrapper}>
        <SpeedSwitch options={VIEWS} value={view} onChangeValue={setView} />
      </div>
      <>{view === 'tokens' ? <TokenList /> : <DefiPositionList />}</>
    </div>
  );
}

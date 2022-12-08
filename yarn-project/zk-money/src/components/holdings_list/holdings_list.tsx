import type { DefiRecipe } from '../../alt-model/defi/types.js';
import { useState, useMemo } from 'react';
import { TokenList } from './token_list.js';
import { DefiInvestments } from '../../components/defi_investments/index.js';
import { useBalances } from '../../alt-model/index.js';
import { useOpenPositions } from '../../alt-model/defi/open_position_hooks.js';
import { Toggle } from '../../ui-components/index.js';
import { useHiddenAssets } from '../../alt-model/defi/hidden_asset_hooks.js';
import style from './holdings_list.module.scss';

const VIEWS = [
  { label: 'Tokens', value: 'tokens' },
  { label: 'Earn Positions', value: 'defi-positions' },
];

type View = typeof VIEWS[number]['value'];

interface HoldingsListProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
  onOpenShieldModal: (assetId: number) => void;
  onOpenSendModal: (assetId: number) => void;
}

export function HoldingsList(props: HoldingsListProps) {
  const [view, setView] = useState<View>('tokens');
  const allBalances = useBalances();
  const hiddenAssets = useHiddenAssets();
  const shownBalances = useMemo(
    () => allBalances?.filter(assetValue => !hiddenAssets.some(hiddenAsset => hiddenAsset.id === assetValue.assetId)),
    [allBalances, hiddenAssets],
  );
  const positions = useOpenPositions();

  return (
    <div className={style.holdingsListWrapper}>
      <div className={style.speedSwitchWrapper}>
        <Toggle options={VIEWS} value={view} onChangeValue={setView} />
      </div>
      <>
        {view === 'tokens' ? (
          <TokenList
            balances={shownBalances}
            onOpenShieldModal={props.onOpenShieldModal}
            onOpenSendModal={props.onOpenSendModal}
          />
        ) : (
          <DefiInvestments positions={positions} onOpenDefiExitModal={props.onOpenDefiExitModal} />
        )}
      </>
    </div>
  );
}

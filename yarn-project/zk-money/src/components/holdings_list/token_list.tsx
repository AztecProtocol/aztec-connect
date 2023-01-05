import { AssetValue } from '@aztec/sdk';
import { recipeFiltersToSearchStr } from '../../alt-model/defi/recipe_filters.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { Pagination } from '../../components/pagination.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOLDINGS_PER_PAGE, slicePage } from './helpers.js';
import { Holding } from './holding.js';
import { usePendingBalances } from '../../alt-model/assets/l1_balance_hooks.js';
import style from './token_list.module.scss';

interface TokenListProps {
  balances: AssetValue[] | undefined;
  onOpenShieldModal: (assetId: number) => void;
  onOpenSendModal: (assetId: number) => void;
}

export function TokenList(props: TokenListProps) {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const pendingBalances = usePendingBalances();

  const handleGoToEarn = (asset: RemoteAsset) => {
    const searchStr = recipeFiltersToSearchStr({ assetSymbol: asset.symbol });
    navigate(`/earn${searchStr}`);
  };

  if (!props.balances) return <></>;
  if (props.balances.length === 0) {
    if (pendingBalances && Object.keys(pendingBalances).length > 0) {
      return (
        <div>
          {Object.keys(pendingBalances).map(pendingBalanceId => {
            const pendingBalance = pendingBalances[pendingBalanceId];
            const assetId = Number(pendingBalanceId);
            return (
              <Holding
                assetValue={{ assetId, value: pendingBalance }}
                onShield={() => props.onOpenShieldModal(assetId)}
              />
            );
          })}
        </div>
      );
    }
    return <div className={style.noTokens}>You have no tokens yet</div>;
  }

  return (
    <>
      {slicePage(props.balances ?? [], page).map(balance => {
        const { assetId } = balance;
        return (
          <Holding
            key={assetId}
            assetValue={balance}
            onSend={() => props.onOpenSendModal(assetId)}
            onShield={() => props.onOpenShieldModal(assetId)}
            onGoToEarn={handleGoToEarn}
          />
        );
      })}
      {props.balances.length > HOLDINGS_PER_PAGE && (
        <Pagination
          totalItems={props.balances?.length ?? 0}
          itemsPerPage={HOLDINGS_PER_PAGE}
          page={page}
          onChangePage={setPage}
        />
      )}
    </>
  );
}

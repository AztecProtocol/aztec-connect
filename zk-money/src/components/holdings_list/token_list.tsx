import { useBalances } from 'alt-model';
import { recipeFiltersToSearchStr } from 'alt-model/defi/recipe_filters';
import { RemoteAsset } from 'alt-model/types';
import { Pagination } from 'components/pagination';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SendModal } from 'views/account/dashboard/modals/send_modal';
import { ShieldModal } from 'views/account/dashboard/modals/shield_modal';
import { HOLDINGS_PER_PAGE, slicePage } from './helpers';
import { Holding } from './holding';

export function TokenList() {
  const navigate = useNavigate();
  const [sendModalAsset, setSendModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [shieldModalAsset, setShieldModalAsset] = useState<RemoteAsset | undefined>(undefined);
  const [page, setPage] = useState(1);
  const balances = useBalances();

  const handleGoToEarn = (asset: RemoteAsset) => {
    const searchStr = recipeFiltersToSearchStr({ assetSymbol: asset.symbol });
    navigate(`/earn${searchStr}`);
  };

  if (!balances) return <></>;
  if (balances.length === 0) return <div>You have no tokens yet.</div>;

  return (
    <>
      {slicePage(balances ?? [], page).map(balance => {
        return (
          <Holding
            key={balance.assetId}
            assetValue={balance}
            onSend={setSendModalAsset}
            onShield={setShieldModalAsset}
            onGoToEarn={handleGoToEarn}
          />
        );
      })}
      {balances.length > HOLDINGS_PER_PAGE && (
        <Pagination
          totalItems={balances?.length ?? 0}
          itemsPerPage={HOLDINGS_PER_PAGE}
          page={page}
          onChangePage={setPage}
        />
      )}
      {sendModalAsset && <SendModal asset={sendModalAsset} onClose={() => setSendModalAsset(undefined)} />}
      {shieldModalAsset && (
        <ShieldModal preselectedAssetId={shieldModalAsset.id} onClose={() => setShieldModalAsset(undefined)} />
      )}
    </>
  );
}

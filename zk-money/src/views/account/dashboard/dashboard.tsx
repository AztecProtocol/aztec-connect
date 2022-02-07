import { useState } from 'react';
import { Earn } from './earn';
import { Send } from './send';
import { Trade } from './trade';
import { Balance } from './balance';
import { DefiModal } from './defi_modal/defi_modal';
import { DefiRecipe } from '../../../alt-model/defi/types';

interface DashboardProps {
  path: string;
}

export function Dashboard({ path }: DashboardProps) {
  const [activeDefiModalRecipe, setActiveDefiModalRecipe] = useState<DefiRecipe>();

  const handleOpenDeFiModal = (recipe: DefiRecipe) => {
    setActiveDefiModalRecipe(recipe);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {path === '/dashboard/earn' && <Earn onOpenDeFiModal={handleOpenDeFiModal} />}
      {path === '/dashboard/send' && <Send />}
      {path === '/dashboard/trade' && <Trade />}
      {path === '/dashboard/balance' && <Balance />}
      {activeDefiModalRecipe && (
        <DefiModal onClose={() => setActiveDefiModalRecipe(undefined)} recipe={activeDefiModalRecipe} />
      )}
      {/* 
          <Route path="/dashboard" exact>
            <AssetSummary assetId={AssetId.ETH} />
            <AssetSummary assetId={AssetId.DAI} />
            <TransactionHistory joinSplitTxs={joinSplitTxs} accountTxs={accountTxs} />
          </Route>
        */}
    </div>
  );
}

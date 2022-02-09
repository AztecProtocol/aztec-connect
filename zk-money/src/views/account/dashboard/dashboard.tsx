import { useState } from 'react';
import { Earn } from './earn';
import { Send } from './send';
import { Trade } from './trade';
import { Balance } from './balance';
import { DefiModal } from './defi_modal/defi_modal';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { Route, Routes } from 'react-router-dom';

export function Dashboard() {
  const [activeDefiModalRecipe, setActiveDefiModalRecipe] = useState<DefiRecipe>();

  const handleOpenDefiModal = (recipe: DefiRecipe) => {
    setActiveDefiModalRecipe(recipe);
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Routes>
        <Route path="/earn" element={<Earn onOpenDefiModal={handleOpenDefiModal} />} />
        <Route path="/sendsend" element={<Send />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/balance" element={<Balance />} />
      </Routes>
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

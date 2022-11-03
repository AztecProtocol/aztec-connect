import type { DefiRecipe } from '../../../alt-model/defi/types.js';
import { useSdk } from '../../../alt-model/top_level_context/index.js';
import { Spinner, SpinnerTheme } from '../../../components/index.js';
import { useState } from 'react';
import { HoldingsList } from '../../../components/holdings_list/holdings_list.js';
import { MyBalance } from '../../../components/my_balance/index.js';
import { ShieldMore } from '../../../components/shield_more/index.js';
import { TransactionHistorySection } from '../../../components/transaction_history/index.js';
import { SendModal } from './modals/send_modal/index.js';
import { ShieldModal } from './modals/shield_modal/index.js';
import style from './balance.module.scss';

function LoadingFallback() {
  return (
    <div className={style.loadingRoot}>
      <Spinner theme={SpinnerTheme.GRADIENT} size="m" />
      Getting things ready...
    </div>
  );
}

type ModalActivation =
  | {
      type: 'send';
      assetId: number;
    }
  | {
      type: 'shield';
      assetId?: number;
    };

function renderModal(activation: ModalActivation | undefined, onClose: () => void) {
  switch (activation?.type) {
    case 'send':
      return <SendModal assetId={activation.assetId} onClose={onClose} />;
    case 'shield':
      return <ShieldModal preselectedAssetId={activation.assetId} onClose={onClose} />;
  }
}

interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function Balance(props: BalanceProps) {
  const [modalActivation, setModalActivation] = useState<ModalActivation>();
  const isLoading = !useSdk();
  if (isLoading) return <LoadingFallback />;

  const handleOpenShieldModal = (assetId?: number) => {
    setModalActivation({ type: 'shield', assetId });
  };

  const handleOpenSendModal = (assetId: number) => {
    setModalActivation({ type: 'send', assetId });
  };

  const handleCloseModal = () => {
    setModalActivation(undefined);
  };

  return (
    <div className={style.balanceWrapper}>
      <div className={style.balances}>
        <MyBalance />
        <ShieldMore onOpenShieldModal={handleOpenShieldModal} />
      </div>
      <HoldingsList
        onOpenDefiExitModal={props.onOpenDefiExitModal}
        onOpenShieldModal={handleOpenShieldModal}
        onOpenSendModal={handleOpenSendModal}
      />
      <TransactionHistorySection />
      {renderModal(modalActivation, handleCloseModal)}
    </div>
  );
}

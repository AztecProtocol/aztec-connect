import { useApp } from 'alt-model';
import type { DefiRecipe } from 'alt-model/defi/types';
import { useSdk } from 'alt-model/top_level_context';
import { Spinner, SpinnerTheme } from 'components';
import { useState } from 'react';
import { HoldingsList } from '../../../components/holdings_list/holdings_list';
import { MyBalance } from '../../../components/my_balance';
import { ShieldMore } from '../../../components/shield_more';
import { TransactionHistorySection } from '../../../components/transaction_history';
import style from './balance.module.scss';
import { IncentiveModal, SelfDismissingIncentiveModal, useShouldShowIncentiveModal } from './modals/incentive_modal';
import { SendModal } from './modals/send_modal';
import { ShieldModal } from './modals/shield_modal';

function LoadingFallback() {
  return (
    <div className={style.loadingRoot}>
      <Spinner theme={SpinnerTheme.GRADIENT} size="m" />
      Getting things ready
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

function renderModal(activation: ModalActivation | undefined, onClose: () => void, onShieldComplete: () => void) {
  switch (activation?.type) {
    case 'send':
      return <SendModal assetId={activation.assetId} onClose={onClose} />;
    case 'shield':
      return (
        <ShieldModal preselectedAssetId={activation.assetId} onClose={onClose} onShieldComplete={onShieldComplete} />
      );
  }
}

interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function Balance(props: BalanceProps) {
  const { alias } = useApp();
  const [hasShielded, setHasShielded] = useState(false);
  const [shouldShowPreShieldIncentiveModal, markPreShieldIncentiveModalAsShown] =
    useShouldShowIncentiveModal('pre_shield');
  const [showingPreShieldIncentiveModal, setShowingPreShieldIncentiveModal] = useState(false);
  const [modalActivation, setModalActivation] = useState<ModalActivation>();
  const isLoading = !useSdk();
  if (isLoading) return <LoadingFallback />;

  const handleShieldComplete = () => {
    setHasShielded(true);
  };

  const handleOpenShieldModal = (assetId?: number) => {
    if (shouldShowPreShieldIncentiveModal && (assetId ?? 0) === 0) {
      setShowingPreShieldIncentiveModal(true);
    } else {
      setModalActivation({ type: 'shield', assetId });
    }
  };

  const handleClosePreShieldIncentiveModal = () => {
    markPreShieldIncentiveModalAsShown();
    setShowingPreShieldIncentiveModal(false);
    setModalActivation({ type: 'shield', assetId: 0 });
  };

  const handleOpenSendModal = (assetId: number) => {
    setModalActivation({ type: 'send', assetId });
  };

  const handleCloseModal = () => {
    setModalActivation(undefined);
  };

  const handleIncentiveShareButtonClick = () => {
    window
      .open(
        `https://twitter.com/intent/tweet?text=Join%20me%20on%20zk.money%2F%3Falias%3D${alias}%20and%20experience%20private%20DeFi.%20Deposit%201ETH%20for%20a%20chance%20to%20win%201ETH.`,
        '_blank',
      )
      ?.focus();
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
      {renderModal(modalActivation, handleCloseModal, handleShieldComplete)}
      {showingPreShieldIncentiveModal && (
        <IncentiveModal
          onClose={handleClosePreShieldIncentiveModal}
          onButtonClick={handleClosePreShieldIncentiveModal}
          buttonLabel="Continue"
        />
      )}
      {hasShielded && !modalActivation && (
        <SelfDismissingIncentiveModal
          instanceName="balance_page_post_shield"
          buttonLabel="Tell your friends on Twitter"
          onButtonClick={handleIncentiveShareButtonClick}
        />
      )}
    </div>
  );
}

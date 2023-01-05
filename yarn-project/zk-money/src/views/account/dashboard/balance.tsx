import { ProofId } from '@aztec/sdk';
import { useState, useEffect } from 'react';
import type { DefiRecipe } from '../../../alt-model/defi/types.js';
import { useSdk } from '../../../alt-model/top_level_context/index.js';
import { HoldingsList } from '../../../components/holdings_list/holdings_list.js';
import { MyBalance } from '../../../components/my_balance/index.js';
import { ShieldMore } from '../../../components/shield_more/index.js';
import { TransactionHistorySection } from '../../../components/transaction_history/index.js';
import { SendModal } from './modals/send_modal/index.js';
import { ShieldModal } from './modals/shield_modal/index.js';
import { useAccountState } from '../../../alt-model/account_state/index.js';
import { AccessAccountForm } from './access_account_form.js';
import { Loader, LoaderSize } from '../../../ui-components/index.js';
import { useCachedAlias } from '../../../alt-model/alias_hooks.js';
import style from './balance.module.scss';
import { useUserTxs } from '../../../alt-model/user_tx_hooks.js';
import { SynchronisationLoadingBar } from '../../../components/index.js';

function LoadingFallback() {
  return (
    <div className={style.loadingRoot}>
      <Loader size={LoaderSize.ExtraLarge} />
    </div>
  );
}
function SyncingFallback() {
  return (
    <div className={style.loadingRoot}>
      <SynchronisationLoadingBar />
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
      recipient: string;
      assetId?: number;
    };

function renderModal(activation: ModalActivation | undefined, onClose: () => void) {
  switch (activation?.type) {
    case 'send':
      return <SendModal assetId={activation.assetId} onClose={onClose} />;
    case 'shield':
      return (
        <ShieldModal
          preselectedRecipient={activation.recipient}
          preselectedAssetId={activation.assetId}
          onClose={onClose}
        />
      );
  }
}
interface BalanceProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

function getFormattedId(userId) {
  if (!userId) return '';
  return userId.toString().replace('0x', 'aztec:0x');
}

export function Balance(props: BalanceProps) {
  const [modalActivation, setModalActivation] = useState<ModalActivation>();
  const accountState = useAccountState();
  const cachedAlias = useCachedAlias();
  const formattedAddress = getFormattedId(accountState?.userId);
  const txs = useUserTxs();
  const isLoading = !useSdk();

  useEffect(() => {
    if (!txs) return;
    const registrationTx = txs.find(tx => tx.proofId === ProofId.ACCOUNT);
    if (!registrationTx) return;
  }, [txs]);

  if (isLoading) return <LoadingFallback />;
  if (accountState?.isSyncing && accountState.isRegistered) return <SyncingFallback />;

  if (!accountState || !accountState.isRegistered)
    return (
      <div className={style.accessAccountFormWrapper}>
        <AccessAccountForm />
      </div>
    );

  const handleOpenShieldModal = (assetId?: number) => {
    const recipient = cachedAlias || formattedAddress;
    setModalActivation({ type: 'shield', assetId, recipient });
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

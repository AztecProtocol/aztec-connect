import { useContext } from 'react';
import { ToastContent, ToastGroup, ToastGroupPosition } from '../../ui-components/index.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { useToasts, useWalletInteractionToasts } from '../../alt-model/top_level_context/index.js';

interface ToastProps {
  toasts?: ToastContent[];
  walletInteractionToast?: ToastContent[];
}

export function Toasts(props: ToastProps) {
  const { toastsObs, walletInteractionToastsObs } = useContext(TopLevelContext);
  const toasts = useToasts();
  const walletInteractionToasts = useWalletInteractionToasts();

  const handleCloseToast = (key: string) => {
    toastsObs.removeToastByKey(key);
  };

  const handleCloseWalletInteractionToast = (key: string) => {
    const toast = walletInteractionToasts.find(t => t.key === key);
    toast?.onClose?.();
    walletInteractionToastsObs.removeToastByKey(key);
  };

  return (
    <>
      {props.toasts || toasts ? (
        <ToastGroup
          position={ToastGroupPosition.BottomCenter}
          toasts={props.toasts ? [...toasts, ...props.toasts] : toasts}
          onCloseToast={handleCloseToast}
        />
      ) : null}
      {walletInteractionToasts ? (
        <ToastGroup
          position={ToastGroupPosition.TopRight}
          toasts={walletInteractionToasts}
          onCloseToast={handleCloseWalletInteractionToast}
        />
      ) : null}
    </>
  );
}

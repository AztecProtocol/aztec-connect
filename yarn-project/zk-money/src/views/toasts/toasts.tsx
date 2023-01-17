import { useContext, useMemo } from 'react';
import { ToastButton, ToastContent, ToastGroup, ToastGroupPosition, ToastType } from '../../ui-components/index.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { useSdk, useToasts, useWalletInteractionToasts } from '../../alt-model/top_level_context/index.js';
import { GlobalErrorItem, useGlobalErrorItems } from '../../alt-model/errors/global_error_hooks.js';
import { confirmAndSendErrorReport, shouldAllowErrorToBeReported } from '../../alt-model/errors/error_utils.js';
import { AztecSdk } from '@aztec/sdk';

function getGlobalErrorItemToastContent(
  item: GlobalErrorItem,
  sdk: AztecSdk | undefined,
  dismiss: (key: string) => void,
): ToastContent {
  let primaryButton: ToastButton | undefined;
  if (shouldAllowErrorToBeReported(item)) {
    primaryButton = {
      text: 'Send error report',
      onClick: () => {
        if (sdk) {
          const confirmedAndSent = confirmAndSendErrorReport(sdk, item.errorDetails);
          if (confirmedAndSent) dismiss(item.key);
        }
      },
    };
  }
  return {
    key: item.key,
    text: item.message,
    closable: true,
    type: ToastType.ERROR,
    primaryButton,
  };
}

interface ToastProps {
  toasts?: ToastContent[];
  walletInteractionToast?: ToastContent[];
}

export function Toasts(props: ToastProps) {
  const sdk = useSdk();
  const { toastsObs, walletInteractionToastsObs } = useContext(TopLevelContext);
  const toasts = useToasts();
  const { globalErrorItems, dismissGlobalErrorItem } = useGlobalErrorItems();
  const walletInteractionToasts = useWalletInteractionToasts();

  const combinedToasts = useMemo(
    () =>
      globalErrorItems
        .map(item => getGlobalErrorItemToastContent(item, sdk, dismissGlobalErrorItem))
        .concat(toasts)
        .concat(props.toasts ?? []),
    [sdk, globalErrorItems, dismissGlobalErrorItem, toasts, props.toasts],
  );

  const handleCloseToast = (key: string) => {
    dismissGlobalErrorItem(key);
    toastsObs.removeToastByKey(key);
  };

  const handleCloseWalletInteractionToast = (key: string) => {
    const toast = walletInteractionToasts.find(t => t.key === key);
    toast?.onClose?.();
    walletInteractionToastsObs.removeToastByKey(key);
  };

  return (
    <>
      <ToastGroup position={ToastGroupPosition.BottomCenter} toasts={combinedToasts} onCloseToast={handleCloseToast} />
      <ToastGroup
        position={ToastGroupPosition.TopRight}
        toasts={walletInteractionToasts}
        onCloseToast={handleCloseWalletInteractionToast}
      />
    </>
  );
}

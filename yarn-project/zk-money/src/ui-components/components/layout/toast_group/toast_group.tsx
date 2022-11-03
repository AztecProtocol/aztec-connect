import { useEffect, useState } from 'react';
import { Toast, ToastContent, ToastType } from '../../../../ui-components/index.js';
import style from './toast_group.module.scss';

export interface ToastGroupProps {
  toasts: ToastContent[];
  onCloseToast: (index: number) => void;
}

export function ToastGroup(props: ToastGroupProps) {
  const [errorToasts, setErrorToasts] = useState<string[]>([]);
  const { toasts } = props;
  const hasToasts = (toasts && Object.keys(toasts).length > 0) || (errorToasts && errorToasts.length > 0);

  const handleCloseErrorToast = (index: number) => {
    setErrorToasts(prevErrorToasts => prevErrorToasts.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    const addErrorToast = (text: string) => {
      setErrorToasts(prevErrorToasts => [...prevErrorToasts, text]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      setTimeout(() => addErrorToast(event.reason?.toString()), 0);
    };

    const handleError = (event: ErrorEvent) => {
      setTimeout(() => addErrorToast(event.message?.toString()), 0);
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className={style.toastGroup}>
      {errorToasts &&
        errorToasts.map((error, index) => (
          <Toast
            key={`error-toast-${index}`}
            index={index}
            onCloseToast={handleCloseErrorToast}
            isClosable={true}
            primaryButton={{
              text: 'Download error log',
              onClick: () => {
                (window as any).exportLogs();
              },
            }}
            type={ToastType.ERROR}
            text={error}
          />
        ))}
      {hasToasts &&
        props.toasts.map((toast, index) => (
          <Toast
            key={`toast-${index}-${toast.key ?? 0}`}
            index={index}
            onCloseToast={props.onCloseToast}
            autocloseInMs={toast.autocloseInMs}
            isHeavy={toast.isHeavy}
            isClosable={toast.isClosable}
            primaryButton={toast.primaryButton}
            secondaryButton={toast.secondaryButton}
            type={toast.type}
            text={toast.text}
          />
        ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import { ToastContent, Toast, ToastType } from '../index.js';
import style from './toast_group.module.scss';
const cx = bindStyle(style);

export enum ToastGroupPosition {
  BottomCenter,
  BottomLeft,
  BottomRight,
  TopRight,
  TopLeft,
  TopCenter,
}

export interface ToastGroupProps {
  toasts: ToastContent[];
  position: ToastGroupPosition;
  showErrors?: boolean;
  onCloseToast: (key: string) => void;
}

export function ToastGroup(props: ToastGroupProps) {
  const [errorToasts, setErrorToasts] = useState<string[]>([]);
  const { toasts, showErrors = false } = props;
  const hasToasts = (toasts && Object.keys(toasts).length > 0) || (errorToasts && errorToasts.length > 0);

  const handleCloseErrorToast = (key: string) => {
    // setErrorToasts(prevErrorToasts => prevErrorToasts.filter((_, idx) => idx !== index));
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
    <div
      className={cx(
        style.toastGroup,
        props.position === ToastGroupPosition.BottomCenter && style.bottomCenter,
        props.position === ToastGroupPosition.BottomLeft && style.bottomLeft,
        props.position === ToastGroupPosition.BottomRight && style.bottomRight,
        props.position === ToastGroupPosition.TopRight && style.topRight,
        props.position === ToastGroupPosition.TopLeft && style.topLeft,
        props.position === ToastGroupPosition.TopCenter && style.topCenter,
      )}
    >
      {showErrors &&
        errorToasts &&
        errorToasts.map((error, index) => (
          <Toast
            key={`error-toast-${index}`}
            index={index}
            onCloseToast={handleCloseErrorToast}
            toast={{
              text: error,
              closable: true,
              type: ToastType.ERROR,
              primaryButton: {
                text: 'Download error log',
                onClick: () => {
                  (window as any).exportLogs();
                },
              },
            }}
          />
        ))}
      {hasToasts &&
        props.toasts.map((toast, index) => (
          <Toast
            key={`toast-${index}-${toast.key ?? 0}`}
            index={index}
            onCloseToast={props.onCloseToast}
            toast={toast}
          />
        ))}
    </div>
  );
}

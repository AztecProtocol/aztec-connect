import { Toast, ToastContent } from 'ui-components';
import style from './toast_group.module.scss';

export interface ToastGroupProps {
  toasts: ToastContent[];
  onCloseToast: (index: number) => void;
}

export function ToastGroup(props: ToastGroupProps) {
  const { toasts } = props;

  if (!toasts || Object.keys(toasts).length === 0) {
    return null;
  }

  return (
    <div className={style.toastGroup}>
      {props.toasts.map((toast, index) => (
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

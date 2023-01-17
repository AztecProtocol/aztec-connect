import { bindStyle } from '../../../ui-components/util/classnames.js';
import { ToastContent, Toast } from '../index.js';
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
  onCloseToast: (key: string) => void;
}

export function ToastGroup(props: ToastGroupProps) {
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
      {props.toasts.map((toast, index) => (
        <Toast key={`toast-${index}-${toast.key ?? 0}`} index={index} onCloseToast={props.onCloseToast} toast={toast} />
      ))}
    </div>
  );
}

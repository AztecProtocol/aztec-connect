import { useEffect, useRef } from 'react';
import { Button, ButtonTheme } from 'ui-components';
import { CloseMiniIcon } from 'ui-components/components/icons';
import { bindStyle } from 'ui-components/util/classnames';
import style from './toast.module.scss';

const cx = bindStyle(style);

export interface ToastContent {
  text: string;
  key?: string;
  type?: ToastType;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  autocloseInMs?: number;
  isClosable?: boolean;
  isHeavy?: boolean;
}

export interface ToastButton {
  text: string;
  onClick: () => void;
}

export enum ToastType {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface ToastProps {
  text: string;
  index?: number;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  isHeavy?: boolean;
  type?: ToastType;
  isClosable?: boolean;
  autocloseInMs?: number;
  onCloseToast?: (index: number) => void;
}

export function Toast(props: ToastProps) {
  const hasPrimaryButton = !!props.primaryButton;
  const hasSecondaryButton = !!props.secondaryButton;
  const hasButtons = hasPrimaryButton || hasSecondaryButton;

  const handleCloseToastRef = useRef(() => {
    if (props.onCloseToast && props.index !== undefined) {
      props.onCloseToast(props.index);
    }
  });

  useEffect(() => {
    if (!props.autocloseInMs) {
      return;
    }

    const timeoutRef = setTimeout(() => {
      handleCloseToastRef.current();
    }, props.autocloseInMs);

    return () => {
      clearTimeout(timeoutRef);
    };
  }, [props.autocloseInMs]);

  return (
    <div
      className={cx(
        style.toast,
        props.isHeavy && style.heavy,
        props.type === ToastType.ERROR && style.error,
        props.type === ToastType.WARNING && style.warning,
      )}
    >
      <div className={style.text}>{props.text}</div>
      {hasButtons && (
        <div className={style.buttons}>
          {props.secondaryButton && (
            <Button
              theme={ButtonTheme.Secondary}
              text={props.secondaryButton.text}
              onClick={props.secondaryButton.onClick}
            />
          )}
          {props.primaryButton && (
            <Button theme={ButtonTheme.Primary} text={props.primaryButton.text} onClick={props.primaryButton.onClick} />
          )}
        </div>
      )}
      {props.onCloseToast && props.isClosable && (
        <div
          className={style.closeButton}
          onClick={e => {
            e.preventDefault();
            handleCloseToastRef.current();
          }}
        >
          <CloseMiniIcon />
        </div>
      )}
    </div>
  );
}

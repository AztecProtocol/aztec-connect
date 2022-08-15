import { useEffect, useRef } from 'react';
import { Button, ButtonTheme } from 'ui-components';
import { CloseMiniIcon } from 'ui-components/components/icons';
import { bindStyle } from 'ui-components/util/classnames';
import { ToastProps, ToastType } from './toast.types';
import style from './toast.module.scss';

const cx = bindStyle(style);

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

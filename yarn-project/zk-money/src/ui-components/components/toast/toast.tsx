import { useEffect, useRef, useState } from 'react';
import { Button, ButtonSize, ButtonTheme } from '../../index.js';
import { CloseMiniIcon } from '../../components/icons/index.js';
import { bindStyle } from '../../util/classnames.js';
import { ToastProps, ToastType } from './toast.types.js';
import style from './toast.module.scss';

const cx = bindStyle(style);
const MAX_TEXT_LENGTH = 400;

export function Toast(props: ToastProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasPrimaryButton = !!props.toast.primaryButton;
  const hasSecondaryButton = !!props.toast.secondaryButton;
  const hasButtons = hasPrimaryButton || hasSecondaryButton;

  const handleCloseToastRef = useRef(() => {
    if (props.onCloseToast && props.toast.key) {
      props.onCloseToast(props.toast.key);
    }
  });

  const handleCollapse = () => {
    setCollapsed(prevValue => !prevValue);
  };

  useEffect(() => {
    if (!props.toast.autocloseInMs) {
      return;
    }

    const timeoutRef = setTimeout(() => {
      handleCloseToastRef.current();
    }, props.toast.autocloseInMs);

    return () => {
      clearTimeout(timeoutRef);
    };
  }, [props.toast.autocloseInMs]);

  return (
    <div
      className={cx(
        style.toast,
        props.toast.heavy && style.heavy,
        props.toast.type === ToastType.ERROR && style.error,
        props.toast.type === ToastType.WARNING && style.warning,
      )}
    >
      {props.toast.text && (
        <div className={style.text}>
          {collapsed ? `${props.toast.text.substring(0, MAX_TEXT_LENGTH)}...` : props.toast.text}
        </div>
      )}
      {props.toast.components}
      {hasButtons && (
        <div className={style.buttons}>
          {props.toast.secondaryButton && (
            <Button
              theme={ButtonTheme.Secondary}
              size={ButtonSize.Medium}
              text={props.toast.secondaryButton.text}
              onClick={props.toast.secondaryButton.onClick}
            />
          )}
          {props.toast.primaryButton && (
            <Button
              theme={ButtonTheme.Primary}
              size={ButtonSize.Medium}
              text={props.toast.primaryButton.text}
              onClick={props.toast.primaryButton.onClick}
            />
          )}
        </div>
      )}
      {props.toast.text && props.toast.text.length > MAX_TEXT_LENGTH && (
        <div className={style.collapseButton} onClick={handleCollapse}>
          {collapsed ? 'Show more' : 'Collapse'}
        </div>
      )}
      {props.onCloseToast && props.toast.closable && (
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

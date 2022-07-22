import { Button, ButtonTheme } from 'ui-components';
import { CloseMiniIcon } from 'ui-components/components/icons';
import { bindStyle } from 'ui-components/util/classnames';
import style from './toast.module.scss';

const cx = bindStyle(style);

export interface ToastContent {
  key?: string;
  text: string;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  isClosable?: boolean;
  isHeavy?: boolean;
}

export interface ToastButton {
  text: string;
  onClick: () => void;
}

export interface ToastProps {
  index: number;
  text: string;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  isHeavy?: boolean;
  isClosable?: boolean;
  onCloseToast?: (index: number) => void;
}

export function Toast(props: ToastProps) {
  const hasPrimaryButton = !!props.primaryButton;
  const hasSecondaryButton = !!props.secondaryButton;
  const hasButtons = hasPrimaryButton || hasSecondaryButton;

  return (
    <div className={cx(style.toast, props.isHeavy && style.heavy)}>
      {props.text}
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
            props.onCloseToast && props.onCloseToast(props.index);
          }}
        >
          <CloseMiniIcon />
        </div>
      )}
    </div>
  );
}

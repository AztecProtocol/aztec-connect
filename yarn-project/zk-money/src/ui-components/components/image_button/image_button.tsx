import { bindStyle } from '../../util/classnames.js';

import keyIcon from '../../images/key.svg';
import keyGreenIcon from '../../images/key_green.svg';
import walletIcon from '../../images/wallet.svg';
import walletGreenIcon from '../../images/wallet_green.svg';
import downloadIcon from '../../images/download.svg';
import downloadGreenIcon from '../../images/download_green.svg';
import copyIcon from '../../images/copy.svg';
import copyGreenIcon from '../../images/copy_green.svg';
import successIcon from '../../images/success.svg';

import style from './image_button.module.scss';
const cx = bindStyle(style);

export enum ImageButtonIcon {
  Key = 'Key',
  KeyGreen = 'KeyGreen',
  Wallet = 'Wallet',
  WalletGreen = 'WalletGreen',
  Download = 'Download',
  DownloadGreen = 'DownloadGreen',
  Copy = 'Copy',
  CopyGreen = 'CopyGreen',
}

interface ImageButtonProps {
  icon: ImageButtonIcon;
  label: string;
  checked?: boolean;
  sublabel?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function getImage(imageButtonIcon: ImageButtonIcon, checked: boolean) {
  switch (imageButtonIcon) {
    case ImageButtonIcon.Key:
      return checked ? keyGreenIcon : keyIcon;
    case ImageButtonIcon.Wallet:
      return checked ? walletGreenIcon : walletIcon;
    case ImageButtonIcon.Download:
      return checked ? downloadGreenIcon : downloadIcon;
    case ImageButtonIcon.Copy:
      return checked ? copyGreenIcon : copyIcon;
  }
}

export function ImageButton(props: ImageButtonProps) {
  function handleClick() {
    if (!props.disabled && props.onClick) {
      props.onClick();
    }
  }

  return (
    <div className={cx(style.root, props.disabled && style.disabled)} onClick={handleClick}>
      {props.checked && <img className={style.tick} alt="Success" src={successIcon} />}
      <img src={getImage(props.icon, !!props.checked)} alt={props.icon} className={style.icon} />
      <div className={style.label}>{props.label}</div>
      {props.sublabel && <div className={style.sublabel}>{props.sublabel}</div>}
    </div>
  );
}

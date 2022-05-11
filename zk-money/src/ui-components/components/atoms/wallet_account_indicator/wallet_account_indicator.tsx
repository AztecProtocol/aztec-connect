import { bindStyle } from 'ui-components/util/classnames';
import { MetamaskIcon, WalletConnectIcon } from '../../icons';
import style from './wallet_account_indicator.module.css';

const cx = bindStyle(style);

const icons = {
  metamask: MetamaskIcon,
  'wallet-connect': WalletConnectIcon,
};

type WalletName = keyof typeof icons;

interface WalletAccountIndicatorProps {
  wallet: WalletName;
  address: string;
  className?: string;
}

export function WalletAccountIndicator(props: WalletAccountIndicatorProps) {
  const Icon = icons[props.wallet];
  return (
    <div className={cx(style.root, props.className)}>
      <Icon />
      <div className={style.address}>{props.address}</div>
    </div>
  );
}

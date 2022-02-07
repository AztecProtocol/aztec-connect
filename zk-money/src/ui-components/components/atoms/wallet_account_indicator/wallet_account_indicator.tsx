import { MetamaskIcon, WalletConnectIcon } from '../../icons';
import style from './wallet_account_indicator.module.css';

const icons = {
  metamask: MetamaskIcon,
  'wallet-connect': WalletConnectIcon,
};

type WalletName = keyof typeof icons;

interface WalletAccountIndicatorProps {
  wallet: WalletName;
  address: string;
}

export function WalletAccountIndicator(props: WalletAccountIndicatorProps) {
  const Icon = icons[props.wallet];
  return (
    <div className={style.root}>
      <Icon />
      <div className={style.address}>{props.address}</div>
    </div>
  );
}

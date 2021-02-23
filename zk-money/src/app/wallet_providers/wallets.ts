import metamaskIcon from '../../images/metamask.png';
import connectIcon from '../../images/connect.png';
import hotIcon from '../../images/hot_wallet.svg';

export enum Wallet {
  METAMASK,
  CONNECT,
  HOT,
}

export const wallets = [
  {
    id: Wallet.METAMASK,
    name: 'Metamask',
    nameShort: 'Metamask',
    icon: metamaskIcon,
  },
  {
    id: Wallet.CONNECT,
    name: 'WalletConnect',
    nameShort: 'Connect',
    icon: connectIcon,
  },
  {
    id: Wallet.HOT,
    name: 'Hot Wallet',
    nameShort: 'Hot Wallet',
    icon: hotIcon,
  },
];

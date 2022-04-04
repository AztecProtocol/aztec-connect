import metamaskIcon from '../../images/metamask.png';
import connectIcon from '../../images/connect.png';
import hotIcon from '../../images/hot_wallet.svg';

export enum WalletId {
  METAMASK,
  CONNECT,
}

export interface Wallet {
  id: WalletId;
  name: string;
  nameShort: string;
  icon: string;
}

export const wallets: Wallet[] = [
  {
    id: WalletId.METAMASK,
    name: 'Metamask',
    nameShort: 'Metamask',
    icon: metamaskIcon,
  },
  {
    id: WalletId.CONNECT,
    name: 'WalletConnect',
    nameShort: 'Connect',
    icon: connectIcon,
  },
];

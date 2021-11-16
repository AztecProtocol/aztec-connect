import { AssetId } from '@aztec/sdk';
import daiIcon from '../images/dai.svg';
import daiWhiteIcon from '../images/dai_white.svg';
import ethIcon from '../images/ethereum.svg';
import ethWhiteIcon from '../images/ethereum_white.svg';
import rbtcIcon from '../images/renBTC.svg';
import rbtcWhiteIcon from '../images/renBTC_white.svg';

export type AppAssetId = AssetId.ETH | AssetId.DAI | AssetId.renBTC;

export interface Asset {
  id: AppAssetId;
  name: string;
  symbol: string;
  icon: string;
  iconWhite: string;
  decimals: number;
  preferredFractionalDigits?: number;
}

export const assets: Asset[] = [
  {
    id: AssetId.ETH,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: ethIcon,
    iconWhite: ethWhiteIcon,
    decimals: 18,
    preferredFractionalDigits: 6,
  },
  {
    id: AssetId.DAI,
    name: 'Dai',
    symbol: 'DAI',
    icon: daiIcon,
    iconWhite: daiWhiteIcon,
    decimals: 18,
    preferredFractionalDigits: 2,
  },
  {
    id: AssetId.renBTC,
    name: 'renBTC',
    symbol: 'renBTC',
    icon: rbtcIcon,
    iconWhite: rbtcWhiteIcon,
    decimals: 8,
    preferredFractionalDigits: 8,
  },
];

import { AssetId } from '@aztec/sdk';
import daiIcon from '../images/dai.svg';
import daiWhiteIcon from '../images/dai_white.svg';
import ethIcon from '../images/ethereum.svg';
import ethWhiteIcon from '../images/ethereum_white.svg';
import wbtcIcon from '../images/wbtc.svg';
import wbtcWhiteIcon from '../images/wbtc_white.svg';

export type AppAssetId = AssetId.ETH | AssetId.DAI | 2;

export interface Asset {
  id: AppAssetId;
  name: string;
  symbol: string;
  icon: string;
  iconWhite: string;
  decimals: number;
  enabled: boolean;
}

export const assets: Asset[] = [
  {
    id: AssetId.ETH,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: ethIcon,
    iconWhite: ethWhiteIcon,
    decimals: 18,
    enabled: true,
  },
  {
    id: AssetId.DAI,
    name: 'Dai',
    symbol: 'DAI',
    icon: daiIcon,
    iconWhite: daiWhiteIcon,
    decimals: 18,
    enabled: false,
  },
  {
    id: 2, // TODO
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    icon: wbtcIcon,
    iconWhite: wbtcWhiteIcon,
    decimals: 18,
    enabled: false,
  },
];

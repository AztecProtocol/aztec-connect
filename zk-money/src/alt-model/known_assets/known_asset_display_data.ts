import { EthAddress } from '@aztec/sdk';
import daiIcon from '../../images/dai.svg';
import daiWhiteIcon from '../../images/dai_white.svg';
import daiGradientIcon from '../../images/dai_gradient.svg';
import ethIcon from '../../images/ethereum.svg';
import ethGradientIcon from '../../images/ethereum_gradient.svg';
import ethWhiteIcon from '../../images/ethereum_white.svg';
import rbtcIcon from '../../images/renBTC.svg';
import rbtcGradientIcon from '../../images/renBTC_gradient.svg';
import rbtcWhiteIcon from '../../images/renBTC_white.svg';
import stEthGradientIcon from '../../images/steth_gradient.svg';
import yearnGradientIcon from '../../images/yearn_gradient.svg';
import questionMarkBlackIcon from '../../images/question_mark_black.svg';
import questionMarkWhiteIcon from '../../images/question_mark_white.svg';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from './known_asset_addresses';

export function getAssetIcon(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
    case S.wETH:
      return ethIcon;
    case S.DAI:
      return daiIcon;
    case S.renBTC:
      return rbtcIcon;
    case S.yvDAI:
    case S.yvETH:
      return yearnGradientIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetIconWhite(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
    case S.wETH:
      return ethWhiteIcon;
    case S.DAI:
      return daiWhiteIcon;
    case S.renBTC:
      return rbtcWhiteIcon;
    case S.yvDAI:
    case S.yvETH:
      return yearnGradientIcon;
    default:
      return questionMarkWhiteIcon;
  }
}

export function getAssetIconGradient(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
    case S.wETH:
      return ethGradientIcon;
    case S.DAI:
      return daiGradientIcon;
    case S.renBTC:
      return rbtcGradientIcon;
    case S.wstETH:
      return stEthGradientIcon;
    case S.yvDAI:
    case S.yvETH:
      return yearnGradientIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetPreferredFractionalDigits(address: EthAddress) {
  return getAssetPreferredFractionalDigitsFromStr(address.toString());
}

export function getAssetPreferredFractionalDigitsFromStr(addressStr: string) {
  switch (addressStr) {
    case S.DAI:
    case S.yvDAI:
      return 2;
    case S.renBTC:
      return 8;
    case S.ETH:
    case S.yvETH:
    case S.wstETH:
    case S.stETH:
    case S.wETH:
      return 6;
  }
}

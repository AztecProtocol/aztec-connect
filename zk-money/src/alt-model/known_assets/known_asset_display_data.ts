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
import questionMarkBlackIcon from '../../images/question_mark_black.svg';
import questionMarkWhiteIcon from '../../images/question_mark_white.svg';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from './known_asset_addresses';

export function getAssetIcon(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
      return ethIcon;
    case S.DAI:
      return daiIcon;
    case S.renBTC:
      return rbtcIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetIconWhite(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
      return ethWhiteIcon;
    case S.DAI:
      return daiWhiteIcon;
    case S.renBTC:
      return rbtcWhiteIcon;
    default:
      return questionMarkWhiteIcon;
  }
}

export function getAssetIconGradient(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
      return ethGradientIcon;
    case S.DAI:
      return daiGradientIcon;
    case S.renBTC:
      return rbtcGradientIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetPreferredFractionalDigits(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
      return 6;
    case S.DAI:
      return 2;
    case S.renBTC:
      return 8;
  }
}

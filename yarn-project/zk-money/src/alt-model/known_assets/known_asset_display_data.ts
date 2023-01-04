import daiIcon from '../../images/dai.svg';
import daiWhiteIcon from '../../images/dai_white.svg';
import daiGradientIcon from '../../images/dai_gradient.svg';
import ethIcon from '../../images/ethereum.svg';
import ethGradientIcon from '../../images/ethereum_gradient.svg';
import ethWhiteIcon from '../../images/ethereum_white.svg';
import stEthGradientIcon from '../../images/steth_gradient.svg';
import stEthWhiteIcon from '../../images/steth_white.svg';
import yearnGradientIcon from '../../images/yearn_gradient.svg';
import eulerGradientIcon from '../../images/euler_gradient.svg';
import aaveGradientIcon from '../../images/aave_token_gradient.svg';
import lusdGradientIcon from '../../images/lusd_gradient.svg';
import compoundGradientIcon from '../../images/compound_token_gradient.svg';
import setGradientIcon from '../../images/set_token_gradient.svg';
import questionMarkBlackIcon from '../../images/question_mark_black.svg';
import questionMarkWhiteIcon from '../../images/question_mark_white.svg';
import { RegisteredAssetLabel } from '../registrations_data/registrations_data_types.js';

type UnregisteredAssetLabel = 'WETH' | 'stETH';

export type AssetLabel = RegisteredAssetLabel | UnregisteredAssetLabel;

export function getAssetIcon(label?: AssetLabel) {
  switch (label) {
    case 'Eth':
    case 'WETH':
      return ethIcon;
    case 'DAI':
      return daiIcon;
    case 'yvDAI':
    case 'yvWETH':
      return yearnGradientIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetIconWhite(label?: AssetLabel) {
  switch (label) {
    case 'Eth':
      return ethWhiteIcon;
    case 'DAI':
      return daiWhiteIcon;
    case 'wstETH':
      return stEthWhiteIcon;
    case 'yvDAI':
    case 'yvWETH':
      return yearnGradientIcon;
    default:
      return questionMarkWhiteIcon;
  }
}

export function getAssetIconGradient(label?: AssetLabel) {
  switch (label) {
    case 'Eth':
      return ethGradientIcon;
    case 'DAI':
      return daiGradientIcon;
    case 'wstETH':
      return stEthGradientIcon;
    case 'yvDAI':
    case 'yvWETH':
      return yearnGradientIcon;
    case 'weWETH':
    case 'weDAI':
    case 'wewstETH':
      return eulerGradientIcon;
    case 'wa2DAI':
    case 'wa2WETH':
      return aaveGradientIcon;
    case 'LUSD':
      return lusdGradientIcon;
    case 'wcDAI':
      return compoundGradientIcon;
    case 'icETH':
      return setGradientIcon;
    default:
      return questionMarkBlackIcon;
  }
}

export function getAssetPreferredFractionalDigits(label?: AssetLabel) {
  switch (label) {
    case 'DAI':
    case 'yvDAI':
    case 'weDAI':
    case 'wa2DAI':
    case 'LUSD':
    case 'TB-275':
    case 'TB-400':
    case 'wcDAI':
      return 2;
    case 'Eth':
    case 'yvWETH':
    case 'wstETH':
    case 'stETH':
    case 'WETH':
    case 'weWETH':
    case 'wewstETH':
    case 'wa2WETH':
      return 6;
  }
}

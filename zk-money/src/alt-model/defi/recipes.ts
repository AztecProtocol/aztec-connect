import { BitConfig, BridgeId } from '@aztec/sdk';
import { BridgeFlow, DefiInvestmentType, DefiRecipe } from './types';
import lidoLogo from '../../images/lido_white.svg';
import elementFiLogo from '../../images/element_fi_logo.svg';
import aaveLogo from '../../images/aave_logo_white.svg';
import ethToDaiBanner from '../../images/eth_to_dai_banner.svg';

interface CreateRecipeArgs extends Omit<DefiRecipe, 'bridgeFlow'> {
  isAsync?: boolean;
  addressId: number;
  inputAssetId: number;
  outAssetIdA: number;
  outAssetIdB: number;
  logo: string;
}

function recipe({ isAsync, addressId, inputAssetId, outAssetIdA, outAssetIdB, ...args }: CreateRecipeArgs): DefiRecipe {
  const enter = new BridgeId(addressId, inputAssetId, outAssetIdA, outAssetIdB, 0, BitConfig.EMPTY, 0);
  const bridgeFlow: BridgeFlow = isAsync
    ? { type: 'async', enter }
    : {
        type: 'closable',
        enter,
        exit: new BridgeId(
          addressId,
          outAssetIdA, // swapped
          inputAssetId, // swapped
          outAssetIdB,
          0,
          BitConfig.EMPTY,
          0,
        ),
      };
  return { ...args, bridgeFlow };
}

const ETH = 0;
const DAI = 1;
const zkwStETH = 3;
// const TO_BE_CONFIRMED = 0;
const NOT_USED = 0;

export const RECIPES = {
  'fake-element-finance.DAI-to-DAI': recipe({
    isAsync: true,
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: zkwStETH,
    outAssetIdB: NOT_USED,
    investmentType: DefiInvestmentType.FIXED_YIELD,
    shortDesc: 'Deposit zkDAI into Element and receive a fixed yield back in xx Days as zkDAI',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: elementFiLogo,
  }),
  'fake-lido-finance.ETH-to-wStETH': recipe({
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: zkwStETH,
    outAssetIdB: NOT_USED,
    investmentType: DefiInvestmentType.STAKING,
    shortDesc:
      'Stake zkETH on the Beacon chain via Lido. Receive a variable yield via the zkwStETH tokens that can be claimed for zkETH',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: lidoLogo,
  }),
  'fake-aave-borrow.ETH-to-DAI': recipe({
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: DAI,
    outAssetIdB: NOT_USED,
    investmentType: DefiInvestmentType.BORROW,
    shortDesc: 'Borrow zkDAI using your zkETH as collateral',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: aaveLogo,
  }),
  'fake-aave-lending.DAI-to-aDAI': recipe({
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: zkwStETH,
    outAssetIdB: NOT_USED,
    investmentType: DefiInvestmentType.YIELD,
    shortDesc: 'Deposit zkDAI into AAVE receive zkADAI in return.',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: aaveLogo,
  }),
  // 'element-finance.DAI-to-DAI': recipe({
  //   addressId: TO_BE_CONFIRMED,
  //   inputAssetId: DAI,
  //   outAssetIdA: DAI,
  //   outAssetIdB: TO_BE_CONFIRMED,
  //   investmentType: DefiInvestmentType.FIXED_YIELD,
  //   shortDesc: 'Deposit zkDAI into Element and receive a fixed yield back in xx Days as zkDAI',
  //   logo: elementFiLogo,
  // }),
  // 'lido-finance.ETH-to-wStETH': recipe({
  //   addressId: TO_BE_CONFIRMED,
  //   inputAssetId: ETH,
  //   outAssetIdA: TO_BE_CONFIRMED,
  //   outAssetIdB: TO_BE_CONFIRMED,
  //   investmentType: DefiInvestmentType.STAKING,
  //   shortDesc:
  //     'Stake zkETH on the Beacon chain via Lido. Receive a variable yield via the zkwStETH tokens that can be claimed for zkETH',
  //   logo: lidoLogo,
  // }),
  // 'aave-borrow.ETH-to-DAI': recipe({
  //   addressId: TO_BE_CONFIRMED,
  //   inputAssetId: ETH,
  //   outAssetIdA: DAI,
  //   outAssetIdB: TO_BE_CONFIRMED,
  //   investmentType: DefiInvestmentType.BORROW,
  //   shortDesc: 'Borrow zkDAI using your zkETH as collateral',
  //   logo: aaveLogo,
  // }),
  // 'aave-lending.DAI-to-aDAI': recipe({
  //   addressId: TO_BE_CONFIRMED,
  //   inputAssetId: DAI,
  //   outAssetIdA: TO_BE_CONFIRMED,
  //   outAssetIdB: TO_BE_CONFIRMED,
  //   investmentType: DefiInvestmentType.YIELD,
  //   shortDesc: 'Deposit zkDAI into AAVE receive zkADAI in return.',
  //   logo: aaveLogo,
  // }),
};

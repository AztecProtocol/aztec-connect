import { BitConfig, BridgeId } from '@aztec/sdk';
import { BridgeFlow, DefiInvestmentType, DefiRecipe, KeyBridgeStat } from './types';
import lidoLogo from '../../images/lido_white.svg';
import lidoMiniLogo from '../../images/lido_mini_logo.png';
import elementFiLogo from '../../images/element_fi_logo.svg';
import elementMiniLogo from '../../images/element_mini_logo.png';
import aaveLogo from '../../images/aave_logo_white.svg';
import aaveMiniLogo from '../../images/aave_mini_logo.png';
import ethToDaiBanner from '../../images/eth_to_dai_banner.svg';
import { createMockYieldAdaptor } from './bridge_data_adaptors/adaptor_mock';
import { createElementAdaptor } from './bridge_data_adaptors/element_adaptor';

interface CreateRecipeArgs extends Omit<DefiRecipe, 'bridgeFlow'> {
  isAsync?: boolean;
  auxData?: number;
  addressId: number;
  inputAssetId: number;
  outAssetIdA: number;
  outAssetIdB: number;
  logo: string;
}

function recipe({
  isAsync,
  auxData,
  addressId,
  inputAssetId,
  outAssetIdA,
  outAssetIdB,
  ...args
}: CreateRecipeArgs): DefiRecipe {
  const enter = new BridgeId(addressId, inputAssetId, outAssetIdA, outAssetIdB, 0, BitConfig.EMPTY, auxData ?? 0);
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
// const zkwStETH = 3;
// const TO_BE_CONFIRMED = 0;
const NOT_USED = 0;

export const RECIPES = {
  'element-finance.DAI-to-DAI': recipe({
    openHandleAssetId: DAI,
    isAsync: true,
    auxData: 1643382446,
    addressId: 2,
    inputAssetId: DAI,
    outAssetIdA: DAI,
    outAssetIdB: NOT_USED,
    createAdaptor: createElementAdaptor,
    name: 'Element Fixed Yield',
    investmentType: DefiInvestmentType.FIXED_YIELD,
    shortDesc: 'Deposit zkDAI into Element and receive a fixed yield back in xx Days as zkDAI',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: elementFiLogo,
    miniLogo: elementMiniLogo,
    keyStat1: KeyBridgeStat.FIXED_YIELD,
    keyStat2: KeyBridgeStat.BATCH_SIZE,
    keyStat3: KeyBridgeStat.MATURITY,
  }),
  'fake-lido-finance.ETH-to-wStETH': recipe({
    openHandleAssetId: DAI,
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: ETH,
    outAssetIdB: NOT_USED,
    createAdaptor: createMockYieldAdaptor,
    name: 'Lido Staking',
    investmentType: DefiInvestmentType.STAKING,
    shortDesc:
      'Stake zkETH on the Beacon chain via Lido. Receive a variable yield via the zkwStETH tokens that can be claimed for zkETH',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: lidoLogo,
    miniLogo: lidoMiniLogo,
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
  }),
  // 'fake-aave-borrow.ETH-to-DAI': recipe({
  //   addressId: 1,
  //   inputAssetId: ETH,
  //   outAssetIdA: DAI,
  //   outAssetIdB: NOT_USED,
  //   dataAdaptor: MOCK_ADAPTOR,
  //   investmentType: DefiInvestmentType.BORROW,
  //   shortDesc: 'Borrow zkDAI using your zkETH as collateral',
  //   longDesc:
  //     'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  //   bannerImg: ethToDaiBanner,
  //   logo: aaveLogo,
  //   keyStat1: KeyBridgeStat.YIELD,
  //   keyStat2: KeyBridgeStat.LIQUIDITY,
  //   keyStat3: KeyBridgeStat.BATCH_SIZE,
  // }),
  'fake-aave-lending.DAI-to-aDAI': recipe({
    openHandleAssetId: DAI,
    addressId: 1,
    inputAssetId: ETH,
    outAssetIdA: DAI,
    outAssetIdB: NOT_USED,
    createAdaptor: createMockYieldAdaptor,
    name: 'AAVE Lending',
    investmentType: DefiInvestmentType.YIELD,
    shortDesc: 'Deposit zkDAI into AAVE receive zkADAI in return.',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bannerImg: ethToDaiBanner,
    logo: aaveLogo,
    miniLogo: aaveMiniLogo,
    keyStat1: KeyBridgeStat.YIELD,
    keyStat2: KeyBridgeStat.LIQUIDITY,
    keyStat3: KeyBridgeStat.BATCH_SIZE,
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

import type { RemoteAsset } from 'alt-model/types';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types';

export enum DefiInvestmentType {
  FIXED_YIELD,
  YIELD,
  STAKING,
  BORROW,
}

export enum KeyBridgeStat {
  YIELD,
  FIXED_YIELD,
  BATCH_SIZE,
  MATURITY,
  LIQUIDITY,
}

export interface DefiRecipe {
  id: string;
  addressId: number;
  closable: boolean;
  openHandleAssetId: number;
  inputAssetA: RemoteAsset;
  outputAssetA: RemoteAsset;
  expectedYearlyOutDerivedFromOutputAssets: boolean;
  createAdaptor: BridgeDataAdaptorCreator;
  name: string;
  logo: string;
  miniLogo: string;
  shortDesc: string;
  bannerImg: string;
  longDescription: string;
  investmentType: DefiInvestmentType;
  keyStat1: KeyBridgeStat;
  keyStat2: KeyBridgeStat;
  keyStat3: KeyBridgeStat;
}

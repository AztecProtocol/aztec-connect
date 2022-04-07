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

export interface BridgeInteractionAssets {
  inA: RemoteAsset;
  outA: RemoteAsset;
}

export type BridgeFlowAssets =
  | {
      type: 'async';
      enter: BridgeInteractionAssets;
    }
  | {
      type: 'closable';
      enter: BridgeInteractionAssets;
      exit: BridgeInteractionAssets;
    };

export interface DefiRecipe {
  id: string;
  addressId: number;
  flow: BridgeFlowAssets;
  openHandleAsset?: RemoteAsset;
  valueEstimationInteractionAssets: BridgeInteractionAssets;
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

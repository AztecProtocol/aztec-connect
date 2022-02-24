import type { BridgeId } from '@aztec/sdk';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types';

export enum DefiInvestmentType {
  FIXED_YIELD,
  YIELD,
  STAKING,
  BORROW,
}

export type BridgeFlow =
  | {
      type: 'closable';
      enter: BridgeId;
      exit: BridgeId;
    }
  | {
      type: 'async';
      enter: BridgeId;
    };

export enum KeyBridgeStat {
  YIELD,
  FIXED_YIELD,
  BATCH_SIZE,
  MATURITY,
  LIQUIDITY,
}

export interface DefiRecipe {
  openHandleAssetId: number;
  bridgeFlow: BridgeFlow;
  createAdaptor: BridgeDataAdaptorCreator;
  name: string;
  logo: string;
  miniLogo: string;
  shortDesc: string;
  bannerImg: string;
  longDesc: string;
  investmentType: DefiInvestmentType;
  keyStat1: KeyBridgeStat;
  keyStat2: KeyBridgeStat;
  keyStat3: KeyBridgeStat;
}

import type { EthAddress } from '@aztec/sdk';
import type { RemoteAsset } from 'alt-model/types';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types';

export enum DefiInvestmentType {
  FIXED_YIELD = 'FIXED_YIELD',
  YIELD = 'YIELD',
  STAKING = 'STAKING',
  BORROW = 'BORROW',
}

export enum KeyBridgeStat {
  YIELD,
  FIXED_YIELD,
  BATCH_SIZE,
  MATURITY,
  LIQUIDITY,
  NEXT_BATCH,
}

export type FlowDirection = 'enter' | 'exit';

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

type AuxDataResolver =
  | {
      type: 'static';
      value: number;
    }
  | {
      type: 'bridge-data-select';
      selectOpt: (opts: number[]) => number | undefined;
    };

export interface DefiRecipe {
  id: string;
  gradient?: string[];
  bridgeAddressId: number;
  exitBridgeAddressId?: number;
  address: EthAddress;
  isAsync?: boolean;
  flow: BridgeFlowAssets;
  openHandleAsset?: RemoteAsset;
  valueEstimationInteractionAssets: BridgeInteractionAssets;
  createAdaptor: BridgeDataAdaptorCreator;
  enterAuxDataResolver: AuxDataResolver;
  exitAuxDataResolver?: AuxDataResolver;
  projectName: string;
  website: string;
  websiteLabel: string;
  name: string;
  logo: string;
  miniLogo: string;
  shortDesc: string;
  exitDesc?: string;
  bannerImg: string;
  roiType: string;
  longDescription: string;
  investmentType: DefiInvestmentType;
  hideUnderlyingOnExit?: boolean;
  keyStat1: KeyBridgeStat;
  keyStat2: KeyBridgeStat;
  keyStat3: KeyBridgeStat;
}

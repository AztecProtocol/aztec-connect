import { BridgeId } from '@aztec/sdk';

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

export interface DefiRecipe {
  bridgeFlow: BridgeFlow;
  logo: string;
  shortDesc: string;
  bannerImg: string;
  longDesc: string;
  investmentType: DefiInvestmentType;
}

import type {
  AssetValue,
  BlockchainBridge,
  BlockchainStatus,
  BridgeCallData,
  EthAddress,
  UserDefiTx,
} from '@aztec/sdk';
import type { RemoteAsset } from 'alt-model/types';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types';

type FormattedRecipePropertyHook = (recipe: DefiRecipe) => string | undefined;

export interface KeyStatConfig {
  label: string;
  skeletonSizingContent: string;
  useFormattedValue: FormattedRecipePropertyHook;
}

export interface KeyStatsConfig {
  keyStat1: KeyStatConfig;
  keyStat2: KeyStatConfig;
  keyStat3: KeyStatConfig;
}

export interface BridgeInteraction {
  bridgeCallData: BridgeCallData;
  inputValue: bigint;
  inputAssetA: RemoteAsset;
  outputAssetA: RemoteAsset;
}

export type InteractionPredictionInfo =
  | {
      type: 'labelled-value';
      label: string;
      formattedValue?: string;
      formattedUnderlyingValue?: string;
    }
  | {
      type: 'text-only';
      text?: string;
    };

export type InteractionPredictionInfoHook = (
  recipe: DefiRecipe,
  interaction: BridgeInteraction,
) => InteractionPredictionInfo;

export type TxBasedTextHook = (recipe: DefiRecipe, tx: UserDefiTx) => string | undefined;
export type AssetValueBasedTextHook = (recipe: DefiRecipe, assetValue: AssetValue) => string | undefined;

export type PositionKeyStatConfig =
  | {
      type: 'async';
      useEnterText: TxBasedTextHook;
      useOpenText: TxBasedTextHook;
      useExitText: TxBasedTextHook;
    }
  | {
      type: 'closable';
      useEnterText: TxBasedTextHook;
      useOpenText: AssetValueBasedTextHook;
      useExitText: TxBasedTextHook;
    };

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
  unlisted?: boolean;
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
  cardTag: string;
  shortDesc: string;
  exitDesc?: string;
  bannerImg: string;
  longDescription: string;
  hideUnderlyingOnExit?: boolean;
  keyStats: KeyStatsConfig;
  useEnterInteractionPredictionInfo?: InteractionPredictionInfoHook;
  useExitInteractionPredictionInfo?: InteractionPredictionInfoHook;
  positionKeyStat: PositionKeyStatConfig;
  getAsyncResolutionDate?: (tx: UserDefiTx) => number | Date | undefined;
}

export interface CreateRecipeArgs
  extends Omit<DefiRecipe, 'bridgeAddressId' | 'address' | 'flow' | 'valueEstimationInteractionAssets'> {
  selectBlockchainBridge: (blockchainStatus: BlockchainStatus) => BlockchainBridge | undefined;
  selectExitBlockchainBridge?: (blockchainStatus: BlockchainStatus) => BlockchainBridge | undefined;
  isAsync?: boolean;
  entryInputAssetAddressA: EthAddress;
  entryOutputAssetAddressA: EthAddress;
  openHandleAssetAddress?: EthAddress;
}

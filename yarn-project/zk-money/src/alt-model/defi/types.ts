import type {
  AssetValue,
  BlockchainBridge,
  BlockchainStatus,
  BridgeCallData,
  EthAddress,
  UserDefiTx,
} from '@aztec/sdk';
import type { RemoteAsset } from '../../alt-model/types.js';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types.js';

type FormattedRecipePropertyHook = (recipe: DefiRecipe) => string | undefined;

export interface KeyStatConfig {
  useLabel: FormattedRecipePropertyHook;
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

export type DefiPublishStatsCacheArgs = [
  number, // periodSeconds
  number, // bridgeAddressId
  number | undefined, // inputAssetIdA
  number | undefined, // inputAssetIdB
  number | undefined, // outputAssetIdA
  number | undefined, // outputAssetIdB
  number | undefined, // auxData
];

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
  cardButtonLabel: string;
  shortDesc: string;
  exitDesc?: string;
  longDescription: string;
  hideUnderlyingOnExit?: boolean;
  keyStats: KeyStatsConfig;
  useEnterInteractionPredictionInfo?: InteractionPredictionInfoHook;
  useExitInteractionPredictionInfo?: InteractionPredictionInfoHook;
  positionKeyStat: PositionKeyStatConfig;
  getAsyncResolutionDate?: (tx: UserDefiTx) => number | Date | undefined;
  getDefiPublishStatsCacheArgs: (bridgeCallData: BridgeCallData) => DefiPublishStatsCacheArgs;
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

import type { AssetValue, BridgeCallData, EthAddress, UserDefiTx } from '@aztec/sdk';
import React from 'react';
import type { RemoteAsset } from '../../alt-model/types.js';
import { RegisteredAssetLabel, RegisteredBridgeLabel } from '../registrations_data/index.js';
import type { BridgeDataAdaptorCreator } from './bridge_data_adaptors/types.js';
import { DefiPosition_Interactable } from './open_position_hooks.js';

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
  inputAssetB?: RemoteAsset;
  outputAssetA: RemoteAsset;
  outputAssetB?: RemoteAsset;
  displayedOutputAsset: RemoteAsset;
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
  inB?: RemoteAsset;
  outA: RemoteAsset;
  outB?: RemoteAsset;
  inDisplayed: RemoteAsset;
  outDisplayed: RemoteAsset;
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
      value: bigint;
    }
  | {
      type: 'bridge-data-select';
      selectOpt: (opts: bigint[]) => bigint | undefined;
    };

export type DefiPublishStatsCacheArgs = [
  number, // bridgeAddressId
  number | undefined, // inputAssetIdA
  number | undefined, // inputAssetIdB
  number | undefined, // outputAssetIdA
  number | undefined, // outputAssetIdB
  bigint | undefined, // auxData
];

export interface DefiRecipe {
  id: string;
  unlisted?: boolean;
  gradient?: string[];
  bridgeAddressId: number;
  exitBridgeAddressId?: number;
  address: EthAddress;
  isAsync?: boolean;
  asyncOpenTooltip?: string;
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
  exitButtonLabel?: string;
  shortDesc: string;
  exitDesc?: string;
  showExchangeRate?: boolean;
  longDescription: string;
  hideUnderlyingOnExit?: boolean;
  keyStats: KeyStatsConfig;
  useEnterInteractionPredictionInfo?: InteractionPredictionInfoHook;
  useExitInteractionPredictionInfo?: InteractionPredictionInfoHook;
  positionKeyStat: PositionKeyStatConfig;
  getAsyncResolutionDate?: (tx: UserDefiTx) => number | Date | undefined;
  getDefiPublishStatsCacheArgs: (bridgeCallData: BridgeCallData) => DefiPublishStatsCacheArgs;
  openHandleAssetHasDebtAndCollateral?: boolean;
  renderCustomClosableValueField?: (position: DefiPosition_Interactable) => React.ReactNode;
  renderExitAuxDataCustomiser?: (props: AuxDataCustomisationComponentProps) => React.ReactNode;
}

export interface AuxDataCustomisationState {
  auxData: bigint | null;
  loading: boolean;
}

export interface AuxDataCustomisationComponentProps {
  recipe: DefiRecipe;
  state: AuxDataCustomisationState;
  onChangeState: (state: AuxDataCustomisationState) => void;
}

export interface BridgeInteractionAssetBindings {
  inA: RegisteredAssetLabel;
  inB?: RegisteredAssetLabel;
  outA: RegisteredAssetLabel;
  outB?: RegisteredAssetLabel;
  inDisplayed: RegisteredAssetLabel;
  outDisplayed: RegisteredAssetLabel;
}

export type BridgeFlowAssetBindings =
  | {
      type: 'async';
      enter: BridgeInteractionAssetBindings;
    }
  | {
      type: 'closable';
      enter: BridgeInteractionAssetBindings;
      exit: BridgeInteractionAssetBindings;
    };

export interface CreateRecipeArgs
  extends Omit<DefiRecipe, 'bridgeAddressId' | 'address' | 'flow' | 'valueEstimationInteractionAssets'> {
  bridgeBinding: RegisteredBridgeLabel;
  exitBridgeBinding?: RegisteredBridgeLabel;
  isAsync?: boolean;
  flowBindings: BridgeFlowAssetBindings;
  openHandleAssetBinding?: RegisteredAssetLabel;
}

import { EthAddress } from '@aztec/sdk';
import { Amount } from '../../alt-model/assets/index.js';
import { getAssetPreferredFractionalDigits } from '../../alt-model/known_assets/known_asset_display_data.js';
import { formatBaseUnits } from '../../app/index.js';
import { RegistrationsRepo } from '../registrations_data/registrations_repo.js';
import { useRegistrationsRepo } from '../top_level_context/top_level_context_hooks.js';
import { useExpectedOutput, useUnderlyingAmount } from './defi_info_hooks.js';
import {
  BridgeInteraction,
  DefiRecipe,
  FlowDirection,
  InteractionPredictionInfoHook,
  InteractionPredictionInfo,
} from './types.js';

function useInteractionPrediction_expectedOutput(
  recipe: DefiRecipe,
  interaction: BridgeInteraction,
  direction: FlowDirection,
  output: 'A' | 'B',
) {
  const expectedOutput = useExpectedOutput(
    recipe.id,
    direction,
    interaction.bridgeCallData.auxData,
    interaction.inputValue,
  );
  const assetValue = output === 'A' ? expectedOutput?.outputValueA : expectedOutput?.outputValueB;
  const asset = output === 'A' ? interaction.outputAssetA : interaction.outputAssetB;
  const formattedValue = assetValue && asset && new Amount(assetValue.value, asset).format({ uniform: true });
  return {
    type: 'labelled-value',
    label: 'You will receive approximately',
    formattedValue,
    expectedOutput,
  } as const;
}

function formatUnderlyingAsset(
  underlyingAsset: { amount: bigint; decimals: number; address: EthAddress; symbol: string } | undefined,
  registrationsRepo: RegistrationsRepo,
) {
  if (!underlyingAsset) return;
  const assetLabel = registrationsRepo.getLabelForAssetAddress(underlyingAsset.address);
  const formatted = formatBaseUnits(underlyingAsset.amount, underlyingAsset.decimals, {
    precision: getAssetPreferredFractionalDigits(assetLabel),
    commaSeparated: true,
  });
  return `${formatted} zk${underlyingAsset.symbol}`;
}

function useInteractionPrediction_expectedOutputWithUnderlying(
  recipe: DefiRecipe,
  interaction: BridgeInteraction,
  direction: FlowDirection,
  output: 'A' | 'B',
): InteractionPredictionInfo {
  const { expectedOutput, ...info } = useInteractionPrediction_expectedOutput(recipe, interaction, direction, output);
  const assetValue = output === 'A' ? expectedOutput?.outputValueA : expectedOutput?.outputValueB;
  const underlyingAsset = useUnderlyingAmount(recipe, assetValue?.value);
  const registrationsRepo = useRegistrationsRepo();
  return {
    ...info,
    formattedUnderlyingValue: formatUnderlyingAsset(underlyingAsset, registrationsRepo),
  };
}

export function bindInteractionPredictionHook_expectedOutput(opts: {
  direction: FlowDirection;
  showUnderlying: boolean;
  outputSelection: 'A' | 'B';
}): InteractionPredictionInfoHook {
  if (opts.showUnderlying) {
    return (recipe, interaction) =>
      useInteractionPrediction_expectedOutputWithUnderlying(recipe, interaction, opts.direction, opts.outputSelection);
  } else {
    return (recipe, interaction) =>
      useInteractionPrediction_expectedOutput(recipe, interaction, opts.direction, opts.outputSelection);
  }
}

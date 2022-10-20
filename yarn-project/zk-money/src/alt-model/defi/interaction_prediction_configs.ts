import { EthAddress } from '@aztec/sdk';
import { Amount } from '../../alt-model/assets/index.js';
import { getAssetPreferredFractionalDigits } from '../../alt-model/known_assets/known_asset_display_data.js';
import { formatBaseUnits } from '../../app/index.js';
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
) {
  const expectedOutput = useExpectedOutput(
    recipe.id,
    direction,
    interaction.bridgeCallData.auxData,
    interaction.inputValue,
  );
  const formattedValue =
    expectedOutput && new Amount(expectedOutput.value, interaction.outputAssetA).format({ uniform: true });
  return {
    type: 'labelled-value',
    label: 'You will receive approximately',
    formattedValue,
    expectedOutput,
  } as const;
}

function formatUnderlyingAsset(
  underlyingAsset: { amount: bigint; decimals: number; address: EthAddress; symbol: string } | undefined,
) {
  if (!underlyingAsset) return;
  const formatted = formatBaseUnits(underlyingAsset.amount, underlyingAsset.decimals, {
    precision: getAssetPreferredFractionalDigits(underlyingAsset.address),
    commaSeparated: true,
  });
  return `${formatted} zk${underlyingAsset.symbol}`;
}

function useInteractionPrediction_expectedOutputWithUnderlying(
  recipe: DefiRecipe,
  interaction: BridgeInteraction,
  direction: FlowDirection,
): InteractionPredictionInfo {
  const { expectedOutput, ...info } = useInteractionPrediction_expectedOutput(recipe, interaction, direction);
  const underlyingAsset = useUnderlyingAmount(recipe, expectedOutput?.value);
  return {
    ...info,
    formattedUnderlyingValue: formatUnderlyingAsset(underlyingAsset),
  };
}

export function bindInteractionPredictionHook_expectedOutput(opts: {
  direction: FlowDirection;
  showUnderlying: boolean;
}): InteractionPredictionInfoHook {
  if (opts.showUnderlying) {
    return (recipe, interaction) =>
      useInteractionPrediction_expectedOutputWithUnderlying(recipe, interaction, opts.direction);
  } else {
    return (recipe, interaction) => useInteractionPrediction_expectedOutput(recipe, interaction, opts.direction);
  }
}

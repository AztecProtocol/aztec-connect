import { formatPercentage_1dp } from '../../app/util/formatters.js';
import { useDefaultExpectedAssetYield } from './defi_info_hooks.js';
import { DefiRecipe } from './types.js';

export function useVariableAprText(recipe: DefiRecipe) {
  const expectedYield = useDefaultExpectedAssetYield(recipe);
  if (expectedYield === undefined) return;
  return `Variable: ${formatPercentage_1dp(expectedYield)} APR`;
}

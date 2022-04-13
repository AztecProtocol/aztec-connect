import { DefiRecipe } from './types';

export interface RecipeFilters {
  type?: string;
  search?: string;
  assetSymbol?: string;
  project?: string;
}

export function searchStrToRecipeFilters(searchStr: string) {
  const pairStrs = searchStr.replace(/^\?/, '').split('&');
  const out: Record<string, string> = {};
  for (const pairStr of pairStrs) {
    const [encodedKey, encodedValue] = pairStr.split('=');
    const key = encodedKey ? decodeURIComponent(encodedKey) : undefined;
    const value = encodedValue ? decodeURIComponent(encodedValue) : undefined;
    if (key && value) out[key] = value;
  }
  return out as RecipeFilters;
}

export function recipeFiltersToSearchStr(filters: RecipeFilters) {
  const pairsStrs: string[] = [];
  for (const key in filters) {
    const value = filters[key as keyof RecipeFilters];
    if (key && value) {
      pairsStrs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  if (!pairsStrs.length) return '';
  else return `?${pairsStrs.join('&')}`;
}

export function filterRecipes(recipes: DefiRecipe[] | undefined, filters: RecipeFilters) {
  if (!recipes) return undefined;
  let out = [...recipes];
  if (filters.type) {
    out = out.filter(x => x.investmentType === filters.type);
  }
  if (filters.project) {
    out = out.filter(x => x.projectName === filters.project);
  }
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    out = out.filter(recipe => recipe.name.toLowerCase().includes(searchLower));
  }
  if (filters.assetSymbol) {
    out = out.filter(
      ({ flow: { enter } }) => enter.inA.symbol === filters.assetSymbol || enter.outA.symbol === filters.assetSymbol,
    );
  }
  return out;
}

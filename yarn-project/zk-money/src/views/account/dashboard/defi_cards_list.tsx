import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section, SectionTitle, SearchInput, Select } from '../../../ui-components/index.js';
import { Obs, useMaybeObs } from '../../../app/util/index.js';
import { DefiCard } from '../../../components/index.js';
import { DefiRecipe } from '../../../alt-model/defi/types.js';
import { useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from '../../../alt-model/top_level_context/index.js';
import {
  filterRecipes,
  RecipeFilters,
  recipeFiltersToSearchStr,
  searchStrToRecipeFilters,
} from '../../../alt-model/defi/recipe_filters.js';
import style from './defi_cards_list.module.scss';
import { useHiddenAssets } from '../../../alt-model/defi/hidden_asset_hooks.js';

interface DefiCardsListProps {
  isLoggedIn: boolean;
  onSelect: (recipe: DefiRecipe) => void;
}

interface InvestmentsFilterProps {
  filters: RecipeFilters;
  onChangeFilters: (filters: RecipeFilters) => void;
  recipes?: DefiRecipe[];
}

function InvestmentsFilter({ filters, onChangeFilters, recipes }: InvestmentsFilterProps) {
  const assetSymbolsSet = new Set(
    recipes?.map(x => x.flow.enter.inA.symbol).concat(recipes.map(x => x.flow.enter.outA.symbol)),
  );
  useHiddenAssets().forEach(hiddenAsset => assetSymbolsSet.delete(hiddenAsset.symbol));
  const assetSymbolOpts = Array.from(assetSymbolsSet).map(value => ({ value, label: value }));
  const tagsSet = new Set(recipes?.map(x => x.cardTag));
  const typeOpts = Array.from(tagsSet).map(value => ({ value, label: value }));
  const projectsSet = new Set(recipes?.map(x => x.projectName));
  const projectOpts = Array.from(projectsSet).map(value => ({ value, label: value }));
  return (
    <div className={style.investmentFilterInputs}>
      <Select
        className={style.select}
        placeholder="Type"
        value={filters.type}
        options={typeOpts}
        allowEmptyValue={true}
        onChange={type => onChangeFilters({ ...filters, type })}
      />
      <Select
        className={style.select}
        placeholder="Project"
        value={filters.project}
        options={projectOpts}
        allowEmptyValue={true}
        onChange={project => onChangeFilters({ ...filters, project })}
      />
      <Select
        className={style.select}
        placeholder="Asset"
        value={filters.assetSymbol}
        options={assetSymbolOpts}
        allowEmptyValue={true}
        onChange={assetSymbol => onChangeFilters({ ...filters, assetSymbol })}
      />
      <SearchInput onChange={search => onChangeFilters({ ...filters, search })} />
    </div>
  );
}

function useRecipeFilters() {
  const navigate = useNavigate();
  const queryString = window.location.search;
  const filters = searchStrToRecipeFilters(queryString);
  const changeFilters = (filters: RecipeFilters) => {
    const searchStr = recipeFiltersToSearchStr(filters);
    navigate(searchStr);
  };
  return { filters, changeFilters };
}

export function useValidRecipesOnly(recipes?: DefiRecipe[]) {
  const { auxDataPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const validRecipesObs = useMemo(() => {
    if (!recipes) return;
    // Each recipe in this list will have it's corresponding aux data opts checked
    const recipesRequiringAuxDataOpts = recipes.filter(x => x.enterAuxDataResolver.type === 'bridge-data-select');
    // Lazy fetch the aux data opts for recipe in the above list
    const recipesAuxDataOptsObs = Obs.combine(
      recipesRequiringAuxDataOpts.map(x => auxDataPollerCache.get([x.id, false])?.obs ?? Obs.constant(undefined)),
    );
    return recipesAuxDataOptsObs.map(recipesAuxDataOpts => {
      let validRecipes = recipes.filter(x => !x.unlisted);
      // Check each item in the aforementioned list, and remove it from
      // the complete recipe list if it doesn't have any aux data opts.
      // We generously assume success until the dat's loaded.
      for (let i = 0; i < recipesAuxDataOpts.length; i++) {
        const recipe = recipesRequiringAuxDataOpts[i];
        const auxDataOpts = recipesAuxDataOpts[i];
        if (auxDataOpts && auxDataOpts.length === 0) {
          validRecipes = validRecipes.filter(x => x !== recipe);
        }
      }
      return validRecipes;
    });
  }, [recipes, auxDataPollerCache]);
  return useMaybeObs(validRecipesObs);
}

export const DefiCardsList = ({ onSelect, isLoggedIn }: DefiCardsListProps) => {
  const { filters, changeFilters } = useRecipeFilters();

  const hasFilters = Object.keys(filters).length > 0;

  const uncheckedRecipes = useDefiRecipes();
  const recipes = useValidRecipesOnly(uncheckedRecipes);
  const filteredRecipes = filterRecipes(recipes, filters);

  return (
    <Section>
      <SectionTitle
        label="Opportunities"
        sideComponent={<InvestmentsFilter recipes={recipes} filters={filters} onChangeFilters={changeFilters} />}
      />
      <div className={style.defiCardsListWrapper}>
        {hasFilters && filteredRecipes?.length === 0 && <div className={style.noResults}>No results found</div>}
        {filteredRecipes?.map(recipe => (
          <DefiCard
            key={recipe.id}
            className={style.defiCard}
            recipe={recipe}
            onSelect={onSelect}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>
    </Section>
  );
};

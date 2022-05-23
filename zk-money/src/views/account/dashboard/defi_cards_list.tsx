import { useMemo } from 'react';
import { Select, Section, SectionTitle, SearchInput } from 'ui-components';
import { Obs, useMaybeObs } from 'app/util';
import { DefiCard } from '../../../components';
import { DefiInvestmentType, DefiRecipe } from '../../../alt-model/defi/types';
import { useBridgeDataAdaptorsMethodCaches, useDefiRecipes } from 'alt-model/top_level_context';
import style from './defi_cards_list.module.scss';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  filterRecipes,
  RecipeFilters,
  recipeFiltersToSearchStr,
  searchStrToRecipeFilters,
} from 'alt-model/defi/recipe_filters';

interface DefiCardsListProps {
  isLoggedIn: boolean;
  onSelect: (recipe: DefiRecipe) => void;
}

interface InvestmentsFilterProps {
  filters: RecipeFilters;
  onChangeFilters: (filters: RecipeFilters) => void;
  recipes?: DefiRecipe[];
}

function getInvestmentTypeLabel(type: DefiInvestmentType): string {
  switch (type) {
    case DefiInvestmentType.FIXED_YIELD:
      return 'FIXED YIELD';
    case DefiInvestmentType.YIELD:
      return 'YIELD';
    case DefiInvestmentType.STAKING:
      return 'STAKING';
    case DefiInvestmentType.BORROW:
      return 'BORROW';
  }
}

function InvestmentsFilter({ filters, onChangeFilters, recipes }: InvestmentsFilterProps) {
  const assetSymbolsSet = new Set(
    recipes?.map(x => x.flow.enter.inA.symbol).concat(recipes.map(x => x.flow.enter.outA.symbol)),
  );
  const assetSymbolOpts = Array.from(assetSymbolsSet).map(value => ({ value, label: value }));
  const typesSet = new Set(recipes?.map(x => x.investmentType));
  const typeOpts = Array.from(typesSet).map(value => ({ value, label: getInvestmentTypeLabel(value) }));
  const projectsSet = new Set(recipes?.map(x => x.projectName));
  const projectOpts = Array.from(projectsSet).map(value => ({ value, label: value }));
  return (
    <div className={style.investmentFilterInputs}>
      <Select
        className={style.select}
        placeholder="Type"
        value={filters.type}
        options={typeOpts}
        onChange={type => onChangeFilters({ ...filters, type })}
      />
      <Select
        className={style.select}
        placeholder="Project"
        value={filters.project}
        options={projectOpts}
        onChange={project => onChangeFilters({ ...filters, project })}
      />
      <Select
        className={style.select}
        placeholder="Asset"
        value={filters.assetSymbol}
        options={assetSymbolOpts}
        onChange={assetSymbol => onChangeFilters({ ...filters, assetSymbol })}
      />
      <SearchInput onChange={search => onChangeFilters({ ...filters, search })} />
    </div>
  );
}

function useRecipeFilters() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const filters = searchStrToRecipeFilters(search);
  const changeFilters = (filters: RecipeFilters) => {
    const searchStr = recipeFiltersToSearchStr(filters);
    navigate(searchStr);
  };
  return { filters, changeFilters };
}

function useValidRecipesOnly(recipes?: DefiRecipe[]) {
  const { auxDataPollerCache } = useBridgeDataAdaptorsMethodCaches();
  const validRecipesObs = useMemo(() => {
    if (!recipes) return;
    // Each recipe in this list will have it's corresponding aux data opts checked
    const recipesRequiringAuxDataOpts = recipes.filter(x => x.requiresAuxDataOpts);
    // Lazy fetch the aux data opts for recipe in the above list
    const recipesAuxDataOptsObs = Obs.combine(
      recipesRequiringAuxDataOpts.map(x => auxDataPollerCache.get(x.id)?.obs ?? Obs.constant(undefined)),
    );
    return recipesAuxDataOptsObs.map(recipesAuxDataOpts => {
      let validRecipes = recipes;
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

import { useState } from 'react';
import { Select, Section, SectionTitle, SearchInput } from 'ui-components';
import { DefiCard } from '../../../components';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { useDefiRecipes } from 'alt-model/top_level_context';
import style from './defi_cards_list.module.scss';

interface DefiCardsListProps {
  isLoggedIn: boolean;
  onSelect: (recipe: DefiRecipe) => void;
}

interface InvestmentsFilterProps {
  onChangeSearch: (value: string) => void;
  onChangeAsset: (value: string) => void;
  onChangeType: (value: string) => void;
  onChangeProject: (value: string) => void;
  assets: Set<string>;
}

function InvestmentsFilter(props: InvestmentsFilterProps) {
  return (
    <div className={style.investmentFilterInputs}>
      <Select
        className={style.select}
        placeholder="Type"
        options={[
          { label: 'type1', value: 'type1' },
          { label: 'type2', value: 'type2' },
        ]}
        onChange={props.onChangeType}
      />
      <Select
        className={style.select}
        placeholder="Project"
        options={[
          { label: 'project1', value: 'project1' },
          { label: 'project2', value: 'project2' },
        ]}
        onChange={props.onChangeProject}
      />
      <Select
        className={style.select}
        placeholder="Asset"
        options={[...props.assets].map(asset => ({ label: asset, value: asset }))}
        onChange={props.onChangeAsset}
      />
      <SearchInput onChange={props.onChangeSearch} />
    </div>
  );
}

function filterRecipeBySearch(
  recipes: DefiRecipe[] | undefined,
  searchFilter: string,
  assetFilter: string,
  typeFilter: string,
) {
  if (!recipes) {
    return recipes;
  }
  if (searchFilter.length > 0) {
    recipes = recipes.filter(recipe => recipe.name.toLowerCase().includes(searchFilter.toLowerCase()));
  }
  if (assetFilter.length > 0) {
    recipes = recipes.filter(
      recipe => recipe.flow.enter.inA.symbol === assetFilter || recipe.flow.enter.outA.symbol === assetFilter,
    );
  }
  return recipes;
}

export const DefiCardsList = ({ onSelect, isLoggedIn }: DefiCardsListProps) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const hasFilters =
    searchFilter.length > 0 || assetFilter.length > 0 || typeFilter.length > 0 || projectFilter.length > 0;

  const recipes = useDefiRecipes();
  const filteredRecipes = filterRecipeBySearch(recipes, searchFilter, assetFilter, typeFilter);

  const inputAssets = recipes?.map(recipe => recipe.flow.enter.inA.symbol) || [];
  const outputAssets = recipes?.map(recipe => recipe.flow.enter.outA.symbol) || [];
  const assets = new Set([...inputAssets, ...outputAssets]);

  return (
    <Section>
      <SectionTitle
        label="Popular Investments"
        sideComponent={
          <InvestmentsFilter
            onChangeSearch={setSearchFilter}
            onChangeType={setTypeFilter}
            onChangeAsset={setAssetFilter}
            onChangeProject={setProjectFilter}
            assets={assets}
          />
        }
      />
      <div className={style.defiCardsListWrapper}>
        {hasFilters && filteredRecipes?.length === 0 && <div className={style.noResults}>No results found</div>}
        {filteredRecipes?.map((recipe, idx) => (
          <DefiCard key={idx} className={style.defiCard} recipe={recipe} onSelect={onSelect} isLoggedIn={isLoggedIn} />
        ))}
      </div>
    </Section>
  );
};

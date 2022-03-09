import { SectionTitle } from 'ui-components';
import { DefiCard } from '../../../components';
import { DefiRecipe } from '../../../alt-model/defi/types';
import style from './defi_cards_list.module.scss';
import { useDefiRecipes } from 'alt-model/top_level_context';

export const DefiCardsList = ({ onSelect }: { onSelect: (recipe: DefiRecipe) => void }) => {
  const recipes = useDefiRecipes();
  return (
    <>
      <SectionTitle label="Popular Investments" />
      <div className={style.defiCardsListWrapper}>
        {recipes?.map((recipe, idx) => (
          <DefiCard key={idx} className={style.defiCard} recipe={recipe} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
};

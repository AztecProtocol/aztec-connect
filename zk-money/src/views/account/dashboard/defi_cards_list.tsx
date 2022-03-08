import { SectionTitle } from 'ui-components';
import { DefiCard } from '../../../components';
import { RECIPES } from '../../../alt-model/defi/recipes';
import { DefiRecipe } from '../../../alt-model/defi/types';
import style from './defi_cards_list.module.scss';

export const DefiCardsList = ({ onSelect }: { onSelect: (recipe: DefiRecipe) => void }) => {
  return (
    <>
      <SectionTitle label="Popular Investments" />
      <div className={style.defiCardsListWrapper}>
        {Object.values(RECIPES).map(recipe => (
          <DefiCard className={style.defiCard} recipe={recipe} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
};

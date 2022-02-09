import styled from 'styled-components/macro';
import { SectionTitle } from 'ui-components';
import { DefiCard } from '../../../components';
import { RECIPES } from '../../../alt-model/defi/recipes';
import { DefiRecipe } from '../../../alt-model/defi/types';

const DefiCardWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 5%;
`;

export const DefiCardsList = ({ onSelect }: { onSelect: (recipe: DefiRecipe) => void }) => {
  return (
    <>
      <SectionTitle label="Popular Investments" />
      <DefiCardWrapper>
        {Object.values(RECIPES).map((recipe, idx) => (
          <DefiCard recipe={recipe} onSelect={onSelect} />
        ))}
      </DefiCardWrapper>
    </>
  );
};

import styled from 'styled-components/macro';
import { SectionTitle } from 'ui-components';
import { DeFiCard } from '../../../components';
import { RECIPES } from '../../../alt-model/defi/recipes';
import { DefiRecipe } from '../../../alt-model/defi/types';

const DeFiCardWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 5%;
`;

export const DeFiCardsList = ({ onSelect }: { onSelect: (recipe: DefiRecipe) => void }) => {
  return (
    <>
      <SectionTitle label="Popular Investments" />
      <DeFiCardWrapper>
        {Object.values(RECIPES).map((recipe, idx) => (
          <DeFiCard recipe={recipe} onSelect={onSelect} />
        ))}
      </DeFiCardWrapper>
    </>
  );
};

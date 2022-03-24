import styled from 'styled-components/macro';
import { BridgeCountDown } from 'features/defi/bridge_count_down';
import { colours } from '../../../styles';
import { DefiRecipe } from 'alt-model/defi/types';

const CardProgress = styled.div`
  width: 100%;
  padding: 0 40px 20px 40px;
  border-bottom: 1px solid ${colours.greyDark};
`;

export const DefiCardProgress = ({ recipe }: { recipe: DefiRecipe }) => {
  return (
    <CardProgress>
      <BridgeCountDown recipe={recipe} />
    </CardProgress>
  );
};

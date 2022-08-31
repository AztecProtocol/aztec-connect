import styled from 'styled-components/macro';
import { EnterBridgeCountDown } from 'features/defi/bridge_count_down';
import { colours } from '../../../styles';
import { DefiRecipe } from 'alt-model/defi/types';

const CardProgress = styled.div`
  width: 100%;
  padding: 25px 25px;
  border-top: 1px solid ${colours.greyDark};
`;

export const DefiCardProgress = ({ recipe }: { recipe: DefiRecipe }) => {
  return (
    <CardProgress>
      <EnterBridgeCountDown recipe={recipe} />
    </CardProgress>
  );
};

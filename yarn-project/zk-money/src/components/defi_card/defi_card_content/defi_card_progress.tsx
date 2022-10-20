import { default as styled } from 'styled-components';
import { EnterBridgeCountDown } from '../../../features/defi/bridge_count_down/index.js';
import { colours } from '../../../styles/index.js';
import { DefiRecipe } from '../../../alt-model/defi/types.js';

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

import { default as styled } from 'styled-components';
import { DefiRecipe } from '../../../alt-model/defi/types.js';
import { BridgeKeyStats } from '../../../features/defi/bridge_key_stats/index.js';
import { colours } from '../../../ui-components/styles/index.js';

const CardStats = styled.div`
  width: 100%;
  border-top: 1px solid ${colours.greyDark};
  padding: 25px 25px;
`;

export const DefiCardStats = (props: { recipe: DefiRecipe }) => {
  return (
    <CardStats>
      <BridgeKeyStats recipe={props.recipe} />
    </CardStats>
  );
};

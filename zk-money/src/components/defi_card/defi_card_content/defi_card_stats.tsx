import { DefiRecipe } from 'alt-model/defi/types';
import { BridgeKeyStats } from 'features/defi/bridge_key_stats';
import styled from 'styled-components/macro';
import { colours } from '../../../styles';

const CardStats = styled.div`
  width: 100%;
  border-top: 1px solid ${colours.greyDark};
  padding: 20px 40px;
`;

export const DefiCardStats = (props: { recipe: DefiRecipe }) => {
  return (
    <CardStats>
      <BridgeKeyStats recipe={props.recipe} />
    </CardStats>
  );
};

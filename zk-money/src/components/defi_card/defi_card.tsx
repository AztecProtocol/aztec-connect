import { Card, CardHeaderSize } from 'ui-components';
import { DeFiCardHeader } from './defi_card_header';
import { DeFiCardContent } from './defi_card_content';
import { DefiRecipe } from '../../alt-model/defi/types';

interface DeFiCardProps {
  recipe: DefiRecipe;
  onSelect: (recipe: DefiRecipe) => void;
}
export const DeFiCard: React.FunctionComponent<DeFiCardProps> = props => {
  return (
    <Card
      cardHeader={<DeFiCardHeader recipe={props.recipe} />}
      cardContent={<DeFiCardContent {...props} />}
      headerSize={CardHeaderSize.LARGE}
    />
  );
};

import { Card, CardHeaderSize } from 'ui-components';
import { DefiCardHeader } from './defi_card_header';
import { DefiCardContent } from './defi_card_content';
import { DefiRecipe } from '../../alt-model/defi/types';

interface DefiCardProps {
  className?: string;
  recipe: DefiRecipe;
  onSelect: (recipe: DefiRecipe) => void;
  isLoggedIn: boolean;
}

export const DefiCard: React.FunctionComponent<DefiCardProps> = props => {
  return (
    <Card
      className={props.className}
      cardHeader={<DefiCardHeader recipe={props.recipe} />}
      cardContent={<DefiCardContent {...props} />}
      headerSize={CardHeaderSize.LARGE}
    />
  );
};

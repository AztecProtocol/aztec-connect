import { Card, CardHeaderSize } from '../../ui-components/index.js';
import { DefiCardHeader } from './defi_card_header/index.js';
import { DefiCardContent } from './defi_card_content/index.js';
import { DefiRecipe } from '../../alt-model/defi/types.js';

interface DefiCardProps {
  className?: string;
  recipe: DefiRecipe;
  onSelect: (recipe: DefiRecipe) => void;
  isLoggedIn: boolean;
}

export const DefiCard: React.FunctionComponent<DefiCardProps> = props => {
  return (
    <Card
      gradient={props.recipe.gradient}
      className={props.className}
      cardHeader={<DefiCardHeader recipe={props.recipe} />}
      cardContent={<DefiCardContent {...props} />}
      headerSize={CardHeaderSize.LARGE}
    />
  );
};

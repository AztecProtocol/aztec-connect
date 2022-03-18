import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiInvestments } from '../../../components/defi_investments';
import { DefiCardsList } from './defi_cards_list';

interface EarnProps {
  onOpenDefiModal: (recipe: DefiRecipe) => void;
  isLoggedIn: boolean;
}

export function Earn(props: EarnProps) {
  const { onOpenDefiModal, isLoggedIn } = props;
  return (
    <div>
      <DefiCardsList onSelect={onOpenDefiModal} isLoggedIn={isLoggedIn} />
      {isLoggedIn && <DefiInvestments />}
    </div>
  );
}

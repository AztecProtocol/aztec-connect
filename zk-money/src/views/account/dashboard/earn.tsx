import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiInvestments } from '../../../components/defi_investments';
import { DefiCardsList } from './defi_cards_list';

interface EarnProps {
  onOpenDefiModal: (recipe: DefiRecipe) => void;
}

export function Earn({ onOpenDefiModal }: EarnProps) {
  return (
    <div>
      <DefiCardsList onSelect={onOpenDefiModal} />
      <DefiInvestments />
    </div>
  );
}

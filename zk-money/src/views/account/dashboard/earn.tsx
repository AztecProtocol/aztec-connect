import { DefiRecipe } from '../../../alt-model/defi/types';
import { DeFiInvestments } from '../../../components/defi_investments';
import { DeFiCardsList } from './defi_cards_list';

interface EarnProps {
  onOpenDeFiModal: (recipe: DefiRecipe) => void;
}

export function Earn({ onOpenDeFiModal }: EarnProps) {
  return (
    <>
      <DeFiCardsList onSelect={onOpenDeFiModal} />
      <DeFiInvestments />
    </>
  );
}

import { DefiInvestmentsSection } from 'components/defi_investments/defi_investments_section';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiCardsList } from './defi_cards_list';

interface EarnProps {
  onOpenDefiEnterModal: (recipe: DefiRecipe) => void;
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
  isLoggedIn: boolean;
}

export function Earn(props: EarnProps) {
  const { onOpenDefiEnterModal, onOpenDefiExitModal, isLoggedIn } = props;
  return (
    <div>
      <DefiCardsList onSelect={onOpenDefiEnterModal} isLoggedIn={isLoggedIn} />
      {isLoggedIn && <DefiInvestmentsSection onOpenDefiExitModal={onOpenDefiExitModal} />}
    </div>
  );
}

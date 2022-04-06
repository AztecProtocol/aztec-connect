import type { DefiRecipe } from 'alt-model/defi/types';
import { FaqHint, Section, SectionTitle } from 'ui-components';
import { DefiInvestments } from './defi_investments';

interface DefiInvestmentsSectionProps {
  onOpenDefiExitModal: (recipe: DefiRecipe, prefilledAmountStr: string) => void;
}

export function DefiInvestmentsSection(props: DefiInvestmentsSectionProps) {
  return (
    <Section>
      <SectionTitle label="DeFi Investments" sideComponent={<FaqHint />} />
      <DefiInvestments {...props} />
    </Section>
  );
}

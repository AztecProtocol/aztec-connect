import { useOpenPositions } from 'alt-model/defi/open_position_hooks';
import type { DefiRecipe } from 'alt-model/defi/types';
import { FaqHint, Section, SectionTitle } from 'ui-components';
import { DefiInvestments } from './defi_investments';

interface DefiInvestmentsSectionProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function DefiInvestmentsSection(props: DefiInvestmentsSectionProps) {
  const positions = useOpenPositions();
  return (
    <Section>
      <SectionTitle label="DeFi Investments" sideComponent={<FaqHint />} />
      <DefiInvestments {...props} positions={positions} />
    </Section>
  );
}

import { useOpenPositions } from '../../alt-model/defi/open_position_hooks.js';
import type { DefiRecipe } from '../../alt-model/defi/types.js';
import { FaqHint, Section, SectionTitle } from '../../ui-components/index.js';
import { DefiInvestments } from './defi_investments.js';

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

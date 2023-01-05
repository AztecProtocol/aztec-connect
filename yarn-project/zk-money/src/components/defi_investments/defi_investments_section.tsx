import { useAccountState } from '../../alt-model/account_state/account_state_hooks.js';
import { useOpenPositions } from '../../alt-model/defi/open_position_hooks.js';
import type { DefiRecipe } from '../../alt-model/defi/types.js';
import { FaqHint, Section, SectionTitle } from '../../ui-components/index.js';
import { SynchronisationLoadingBar } from '../index.js';
import { DefiInvestments } from './defi_investments.js';

interface DefiInvestmentsSectionProps {
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function DefiInvestmentsSection(props: DefiInvestmentsSectionProps) {
  const isSyncing = useAccountState()?.isSyncing;
  const positions = useOpenPositions();
  return (
    <Section>
      <SectionTitle label="DeFi Investments" sideComponent={<FaqHint />} />
      {isSyncing ? <SynchronisationLoadingBar /> : <DefiInvestments {...props} positions={positions} />}
    </Section>
  );
}

import { Section, SectionTitle } from '../../ui-components/index.js';
import { TransactionHistory } from './transaction_history.js';

export function TransactionHistorySection() {
  return (
    <Section>
      <SectionTitle label="Transaction History" />
      <TransactionHistory />
    </Section>
  );
}

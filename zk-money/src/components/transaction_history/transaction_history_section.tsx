import { Section, SectionTitle } from 'ui-components';
import { TransactionHistory } from './transaction_history';

export function TransactionHistorySection() {
  return (
    <Section>
      <SectionTitle label="Transaction History" />
      <TransactionHistory />
    </Section>
  );
}

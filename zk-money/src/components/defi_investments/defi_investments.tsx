import { SectionTitle } from 'ui-components';
import { useState } from 'react';
import { Pagination } from '..';
import { DeFiInvestment } from './defi_investment';

const INVESTMENTS = [
  { name: 'Aave Lending 1', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 2', apy: 2.45, amount: 1000.45 },
  { name: 'Aave Lending 3', apy: 2.45, amount: 1000.45, isLocked: true },
  { name: 'Aave Lending 4', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 5', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 6', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 7', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 8', apy: 2.45, amount: 1000.45, eta: 21 },
  { name: 'Aave Lending 9', apy: 2.45, amount: 1000.45, eta: 21 },
];
const INVESTMENTS_PER_PAGE = 5;

export function DeFiInvestments() {
  const [page, setPage] = useState(1);

  return (
    <>
      <SectionTitle label="DeFi Investments" showFaq={true} />
      {INVESTMENTS.slice((page - 1) * INVESTMENTS_PER_PAGE, page * INVESTMENTS_PER_PAGE).map((investment, idx) => (
        <DeFiInvestment
          key={idx}
          name={investment.name}
          apy={investment.apy}
          amount={investment.amount}
          eta={investment.eta}
          isLocked={investment.isLocked}
        />
      ))}
      <Pagination
        totalItems={INVESTMENTS.length}
        itemsPerPage={INVESTMENTS_PER_PAGE}
        page={page}
        onChangePage={setPage}
      />
    </>
  );
}

import { FaqHint, SectionTitle } from 'ui-components';
import { useState } from 'react';
import { Pagination } from '..';
import { DefiInvestmentRow } from './defi_investment_row';
import { useOpenPositions } from 'alt-model/defi/open_position_hooks';

const INVESTMENTS_PER_PAGE = 5;

export function DefiInvestments() {
  const [page, setPage] = useState(1);
  const positions = useOpenPositions();

  return (
    <>
      <SectionTitle label="DeFi Investments" sideComponent={<FaqHint />} />
      {positions && positions.length > 0 ? (
        <>
          {positions?.slice((page - 1) * INVESTMENTS_PER_PAGE, page * INVESTMENTS_PER_PAGE).map((position, idx) => (
            <DefiInvestmentRow key={idx} position={position} />
          ))}
          <Pagination
            totalItems={positions.length}
            itemsPerPage={INVESTMENTS_PER_PAGE}
            page={page}
            onChangePage={setPage}
          />
        </>
      ) : (
        <div>You haven't made any investments yet</div>
      )}
    </>
  );
}

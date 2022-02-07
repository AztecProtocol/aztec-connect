import styled from 'styled-components/macro';
import { useParsedAccountTxs, useParsedJoinSplitTxs } from '../../../alt-model';
import { HoldingsList } from '../../../components/holdings_list/holdings_list';
import { MyBalance } from '../../../components/my_balance';
import { ShieldMore } from '../../../components/shield_more';
import { TransactionHistory } from '../transaction_history';

const Balances = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  gap: 5%;
`;

export function Balance() {
  const accountTxs = useParsedAccountTxs();
  const joinSplitTxs = useParsedJoinSplitTxs();
  return (
    <>
      <Balances>
        <MyBalance />
        <ShieldMore />
      </Balances>
      <HoldingsList />
      <TransactionHistory accountTxs={accountTxs} joinSplitTxs={joinSplitTxs} />
    </>
  );
}

import { formatBulkPrice } from 'app';
import styled from 'styled-components/macro';
import { Card, CardHeaderSize } from 'ui-components';
import { InfoButton } from '..';
import { useTotalValuation, useTotalSpendableValuation } from '../../alt-model/total_account_valuation_hooks';
import { gradients } from '../../styles';
import style from './my_balance.module.scss';

const Amount = styled.h1`
  font-size: 56px;
  height: 62px;
  background-color: ${gradients.primary.from};
  background-image: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
  background-size: 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  -webkit-text-fill-color: transparent;
  -moz-text-fill-color: transparent;
`;

const InformationWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export function MyBalance() {
  const totalValuation = useTotalValuation();
  const totalValuationStr = totalValuation !== undefined && formatBulkPrice(totalValuation);
  const totalSpendableValuation = useTotalSpendableValuation();
  const totalSpendableValuationStr = totalSpendableValuation !== undefined && formatBulkPrice(totalSpendableValuation);

  return (
    <Card
      className={style.myBalance}
      cardHeader={'Net Worth'}
      cardContent={
        <div className={style.balanceWrapper}>
          <div className={style.amountWrapper}>
            <Amount>{totalValuationStr ? `$${totalValuationStr}` : 'Loading...'}</Amount>
          </div>
          <InformationWrapper>
            <h2 className={style.available}>
              {totalSpendableValuationStr ? `Available $${totalSpendableValuationStr}` : 'Loading...'}
            </h2>
            <InfoButton />
          </InformationWrapper>
        </div>
      }
      headerSize={CardHeaderSize.LARGE}
    />
  );
}

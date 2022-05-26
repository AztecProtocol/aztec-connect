import { formatBulkPrice } from 'app';
import styled from 'styled-components/macro';
import { Card, CardHeaderSize, Hyperlink, InteractiveTooltip } from 'ui-components';
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
  padding: 10px 0px;
  position: relative;
`;

function TooltipContent() {
  return (
    <p>
      The total market value of assets held in zk.money, including illiquid DeFi positions.
      <br />
      <br />
      Funds may be unavailable while the rollup settles to Ethereum mainnet.
      <br />
      <br /> Learn how we query prices and assets values{' '}
      <Hyperlink
        href="https://aztecnetwork.notion.site/New-zk-money-user-guide-803ea618e67b4beaa44fbe97360efa62"
        label="here."
      />
    </p>
  );
}

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
            <InteractiveTooltip content={<TooltipContent />} />
          </InformationWrapper>
        </div>
      }
      headerSize={CardHeaderSize.LARGE}
    />
  );
}

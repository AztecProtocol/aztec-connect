import { formatBulkPrice } from 'app';
import { Card, CardHeaderSize, Hyperlink, InteractiveTooltip, SkeletonRect, useUniqueId } from 'ui-components';
import { useTotalValuation, useTotalSpendableValuation } from '../../alt-model/total_account_valuation_hooks';
import style from './my_balance.module.scss';

function TooltipContent() {
  return (
    <p>
      The total market value of assets held in zk.money, including illiquid DeFi positions.
      <br />
      <br />
      Funds may be unavailable while the rollup settles to Ethereum mainnet.
      <br />
      <br /> Learn how we query prices and assets values{' '}
      <Hyperlink href="https://docs.aztec.network/how-aztec-works/faq" label="here." />
    </p>
  );
}

function GradientSpinner() {
  const id = useUniqueId();
  return (
    <svg
      width={25}
      height={25}
      className={style.spinner}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <linearGradient id={`${id}`} x1="5" y1="20" x2="20" y2="5" gradientUnits="userSpaceOnUse">
        <stop stop-color="#944AF2" />
        <stop offset="1" stop-color="#448FFF" />
      </linearGradient>
      <path
        opacity={0.2}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 25C19.404 25 25 19.404 25 12.5S19.404 0 12.5 0 0 5.596 0 12.5 5.596 25 12.5 25Zm0-4a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z"
        fill={`url(#${id})`}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.237 20.893A12.468 12.468 0 0 0 12.5 25C19.404 25 25 19.404 25 12.5 25 5.836 19.785.39 13.214.02v4.01a8.5 8.5 0 1 1-7.648 13.387l-2.33 3.476Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function MyBalance() {
  const { bulkPrice: totalValuation, loading, firstPriceReady } = useTotalValuation();
  const { bulkPrice: totalSpendableValuation } = useTotalSpendableValuation();

  return (
    <Card
      className={style.myBalance}
      cardHeader={<div className={style.cardHeader}>Net Worth</div>}
      cardContent={
        <div className={style.balanceWrapper}>
          <div className={style.amountWrapper}>
            <h1 className={style.amount}>
              {firstPriceReady ? (
                <>
                  {`$${formatBulkPrice(totalValuation)}`}
                  {loading && <GradientSpinner />}
                </>
              ) : (
                <SkeletonRect sizingContent="$1000.00" />
              )}
            </h1>
          </div>
          <div className={style.informationWrapper}>
            <div>
              <h2 className={style.available}>
                {firstPriceReady ? (
                  `$${formatBulkPrice(totalSpendableValuation)} available`
                ) : (
                  <SkeletonRect sizingContent="$1000.00 available" />
                )}
              </h2>
            </div>
            <InteractiveTooltip content={<TooltipContent />} />
          </div>
        </div>
      }
      headerSize={CardHeaderSize.LARGE}
    />
  );
}

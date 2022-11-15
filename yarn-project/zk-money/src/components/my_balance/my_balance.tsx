import { formatBulkPrice } from '../../app/index.js';
import {
  Card,
  CardHeaderSize,
  Hyperlink,
  InteractiveTooltip,
  Loader,
  LoaderSize,
  SkeletonRect,
} from '../../ui-components/index.js';
import { useTotalValuation, useTotalSpendableValuation } from '../../alt-model/total_account_valuation_hooks.js';
import style from './my_balance.module.scss';
import { useAccountStateManager } from '../../alt-model/top_level_context/index.js';
import { useObs } from '../../app/util/index.js';

function TooltipContent() {
  return (
    <p>
      The total market value of assets held in zk.money, including illiquid DeFi positions.
      <br />
      <br />
      Funds may be unavailable while the rollup settles to Ethereum mainnet.
      <br />
      <br /> Learn how we query prices and assets values{' '}
      <Hyperlink href="https://docs.aztec.network/zk-money/assetvaluation" label="here." />
    </p>
  );
}

export function MyBalance() {
  const { bulkPrice: totalValuation, loading, firstPriceReady } = useTotalValuation();
  const { bulkPrice: totalSpendableValuation } = useTotalSpendableValuation();
  const accountStateManager = useAccountStateManager();
  const accountState = useObs(accountStateManager.stateObs);
  const isSynced = accountState && !accountState.isSyncing;

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
                  {(loading || !isSynced) && <Loader size={LoaderSize.Small} />}
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
      headerSize={CardHeaderSize.MEDIUM}
    />
  );
}

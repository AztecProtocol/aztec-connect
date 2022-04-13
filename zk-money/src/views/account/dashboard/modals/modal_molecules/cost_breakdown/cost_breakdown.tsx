import { fromBaseUnits } from '@aztec/sdk';
import { useAssetUnitPrice } from 'alt-model';
import { Amount } from 'alt-model/assets/amount';
import { formatBulkPrice, PRICE_DECIMALS } from 'app';
import { ShieldedAssetIcon, Text } from 'components';
import style from './cost_breakdown.module.css';

interface RowProps {
  label: string;
  amount?: Amount;
  costStr: string;
}

function Row({ label, amount, costStr }: RowProps) {
  return (
    <>
      <Text text={label} />
      <Text color="grey" size="s" text={costStr} />
      {amount && <ShieldedAssetIcon size="s" address={amount.address} />}
      {amount && <Text size="s" weight="bold" italic text={amount.format()} />}
    </>
  );
}

function maybeBulkPriceStr(bulkPrice?: bigint) {
  if (bulkPrice === undefined) return '';
  return '$' + formatBulkPrice(bulkPrice);
}

interface CostBreakdownProps {
  amount?: Amount;
  fee?: Amount;
}

export function CostBreakdown({ amount, fee }: CostBreakdownProps) {
  const isInOneAsset = amount && amount.id === fee?.id;
  const total = isInOneAsset ? amount.add(fee.baseUnits) : undefined;
  const amountAssetUnitPrice = useAssetUnitPrice(amount?.id);
  const amountBulkPrice = amountAssetUnitPrice === undefined ? undefined : amount?.toBulkPrice(amountAssetUnitPrice);
  const feeAssetUnitPrice = useAssetUnitPrice(fee?.id);
  const feeBulkPrice = feeAssetUnitPrice === undefined ? undefined : fee?.toBulkPrice(feeAssetUnitPrice);
  const totalBulkPrice =
    amountBulkPrice !== undefined && feeBulkPrice !== undefined ? amountBulkPrice + feeBulkPrice : undefined;
  return (
    <div className={style.root}>
      <Row label="Amount" amount={amount} costStr={maybeBulkPriceStr(amountBulkPrice)} />
      <Row label="Gas Fee" amount={fee} costStr={maybeBulkPriceStr(feeBulkPrice)} />
      <Row label="Total Cost" amount={total} costStr={maybeBulkPriceStr(totalBulkPrice)} />
    </div>
  );
}

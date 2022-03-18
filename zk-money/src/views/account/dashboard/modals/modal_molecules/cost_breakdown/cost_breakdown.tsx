import { fromBaseUnits } from '@aztec/sdk';
import { useAssetPrice } from 'alt-model';
import { Amount } from 'alt-model/assets/amount';
import { PRICE_DECIMALS } from 'app';
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

function maybeCostStr(cost?: bigint) {
  if (cost === undefined) return '';
  return '$' + fromBaseUnits(cost, PRICE_DECIMALS, 2);
}

interface CostBreakdownProps {
  amount?: Amount;
  fee?: Amount;
}

export function CostBreakdown({ amount, fee }: CostBreakdownProps) {
  const isInOneAsset = amount && amount.id === fee?.id;
  const total = isInOneAsset ? amount.add(fee.baseUnits) : undefined;
  const amountAssetPrice = useAssetPrice(amount?.id);
  const amountCost = amountAssetPrice === undefined ? undefined : amount?.toUsd(amountAssetPrice);
  const feeAssetPrice = useAssetPrice(fee?.id);
  const feeCost = feeAssetPrice === undefined ? undefined : fee?.toUsd(feeAssetPrice);
  const totalCost = amountCost !== undefined && feeCost !== undefined ? amountCost + feeCost : undefined;
  return (
    <div className={style.root}>
      <Row label="Amount" amount={amount} costStr={maybeCostStr(amountCost)} />
      <Row label="Gas Fee" amount={fee} costStr={maybeCostStr(feeCost)} />
      <Row label="Total Cost" amount={total} costStr={maybeCostStr(totalCost)} />
    </div>
  );
}

import { EthAddress } from '@aztec/sdk';
import { useAssetUnitPrice } from 'alt-model';
import { Amount } from 'alt-model/assets/amount';
import { formatBulkPrice } from 'app';
import { ShieldedAssetIcon } from 'components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './cost_breakdown.module.css';

const cx = bindStyle(style);

interface CostBreakdownProps {
  amount?: Amount;
  fee?: Amount;
  recipient?: string;
}

interface RowProps {
  label: string;
  cost?: string;
  className?: string;
  address?: EthAddress;
  value?: string;
}

function Row({ label, cost, address, value, className }: RowProps) {
  return (
    <div className={cx(style.row, className)}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={cx(style.value, style.cost)}>{cost}</div>
        <div className={cx(style.value, style.shieldIcon)}>
          {address && <ShieldedAssetIcon size="s" address={address} />}
        </div>
        <div className={cx(style.value)}>{value}</div>
      </div>
    </div>
  );
}

function maybeBulkPriceStr(bulkPrice?: bigint) {
  if (bulkPrice === undefined) return '';
  return '$' + formatBulkPrice(bulkPrice);
}

export function CostBreakdown({ amount, fee, recipient }: CostBreakdownProps) {
  const amountAssetUnitPrice = useAssetUnitPrice(amount?.id);
  const amountBulkPrice = amountAssetUnitPrice === undefined ? undefined : amount?.toBulkPrice(amountAssetUnitPrice);
  const feeAssetUnitPrice = useAssetUnitPrice(fee?.id);
  const feeBulkPrice = feeAssetUnitPrice === undefined ? undefined : fee?.toBulkPrice(feeAssetUnitPrice);
  const totalBulkPrice = amountBulkPrice !== undefined && feeBulkPrice !== undefined ? amountBulkPrice : undefined;

  return (
    <div className={style.root}>
      <Row label="Recipient" value={recipient} />
      <Row
        className={style.zebra}
        label="Amount"
        cost={maybeBulkPriceStr(totalBulkPrice)}
        address={amount?.address}
        value={amount?.format()}
      />
      <Row label="Gas Fee" cost={maybeBulkPriceStr(feeBulkPrice)} address={fee?.address} value={fee?.format()} />
    </div>
  );
}

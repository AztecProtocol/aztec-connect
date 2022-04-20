import { useAmountBulkPrice } from 'alt-model';
import { Amount } from 'alt-model/assets';
import { formatBulkPrice } from 'app';
import style from './fee_bulk_price_sub_label.module.css';

export function FeeBulkPriceSubLabel({ feeAmount }: { feeAmount?: Amount }) {
  const feeBulkPrice = useAmountBulkPrice(feeAmount);
  const feeBulkPriceStr = feeBulkPrice !== undefined ? `$${formatBulkPrice(feeBulkPrice)}` : undefined;
  return <div className={style.root}>{feeBulkPriceStr}</div>;
}

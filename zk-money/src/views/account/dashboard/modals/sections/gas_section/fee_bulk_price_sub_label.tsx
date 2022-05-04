import moment from 'moment';
import { useAmountBulkPrice } from 'alt-model';
import { Amount } from 'alt-model/assets';
import { formatBulkPrice } from 'app';
import style from './fee_bulk_price_sub_label.module.css';
interface FeeBulkPriceSubLabelProps {
  expectedTimeOfSettlement?: Date;
  feeAmount?: Amount;
  deductionIsFromL1?: boolean;
}
export function FeeBulkPriceSubLabel({
  expectedTimeOfSettlement,
  feeAmount,
  deductionIsFromL1,
}: FeeBulkPriceSubLabelProps) {
  const feeBulkPrice = useAmountBulkPrice(feeAmount);
  const feeBulkPriceStr = feeBulkPrice !== undefined ? `$${formatBulkPrice(feeBulkPrice)}` : undefined;
  const timeStr = expectedTimeOfSettlement ? moment(expectedTimeOfSettlement).fromNow(true) : '';
  return (
    <div className={style.root}>
      <div>{timeStr}</div>
      <div>{feeAmount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}</div>
      <div>{feeBulkPriceStr}</div>
    </div>
  );
}

import { useAmountBulkPrice } from 'alt-model';
import { Amount } from 'alt-model/assets';
import { formatBulkPrice } from 'app';
import moment from 'moment';
import style from './fee_option_content.module.css';

interface FeeOptionContentProps {
  label: string;
  expectedTimeOfSettlement?: Date;
  feeAmount?: Amount;
  deductionIsFromL1?: boolean;
}

export function FeeOptionContent(props: FeeOptionContentProps) {
  const timeStr = props.expectedTimeOfSettlement ? moment(props.expectedTimeOfSettlement).fromNow(true) : '';
  const feeAmountStr = props.feeAmount?.format({ layer: props.deductionIsFromL1 ? 'L1' : 'L2' });
  const feeBulkPrice = useAmountBulkPrice(props.feeAmount);
  const feeBulkPriceStr = feeBulkPrice !== undefined ? `$${formatBulkPrice(feeBulkPrice)}` : undefined;
  return (
    <div className={style.root}>
      <div className={style.label}>{props.label}</div>
      <div className={style.time}>{timeStr}</div>
      <div className={style.amount}>{feeAmountStr}</div>
      <div className={style.price}>{feeBulkPriceStr}</div>
    </div>
  );
}

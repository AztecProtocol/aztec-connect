import { useAmountBulkPrice } from '../../../../../../../alt-model/index.js';
import { Amount } from '../../../../../../../alt-model/assets/index.js';
import { formatBulkPrice } from '../../../../../../../app/index.js';
import moment from 'moment';
import style from './fee_option_content.module.scss';

interface FeeOptionContentProps {
  label: string;
  expectedTimeOfSettlement?: Date;
  averageTimeoutSeconds?: number;
  feeAmount?: Amount;
  deductionIsFromL1?: boolean;
}

function formatTime(expectedTimeOfSettlement?: Date, averageTimeoutSeconds?: number) {
  if (expectedTimeOfSettlement) return moment(expectedTimeOfSettlement).fromNow(true);
  if (averageTimeoutSeconds) return '~ ' + moment(Date.now() + averageTimeoutSeconds * 1000).fromNow(true);
  if (averageTimeoutSeconds === 0) return 'TBD';
  return '';
}

export function FeeOptionContent(props: FeeOptionContentProps) {
  const timeStr = formatTime(props.expectedTimeOfSettlement, props.averageTimeoutSeconds);
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

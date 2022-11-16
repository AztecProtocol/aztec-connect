import { useAmountBulkPrice } from '../../../../../../alt-model/index.js';
import { Amount } from '../../../../../../alt-model/assets/amount.js';
import { formatBulkPrice } from '../../../../../../app/index.js';
import { CostBreakdownRecipientRow, CostBreakdownValueRow } from './cost_breakdown_rows.js';
import style from './cost_breakdown.module.css';

interface CostBreakdownProps {
  amountLabel: string;
  amount?: Amount;
  fee?: Amount;
  recipient: string;
  deductionIsFromL1?: boolean;
  feeDeductionIsFromL1?: boolean;
  investmentRowElement?: React.ReactNode;
}

function maybeBulkPriceStr(bulkPrice?: bigint) {
  if (bulkPrice === undefined) return '';
  return '$' + formatBulkPrice(bulkPrice);
}

export function CostBreakdown({
  amountLabel,
  amount,
  fee,
  recipient,
  deductionIsFromL1,
  feeDeductionIsFromL1,
  investmentRowElement,
}: CostBreakdownProps) {
  const amountBulkPrice = useAmountBulkPrice(amount);
  const feeBulkPrice = useAmountBulkPrice(fee);

  const totalBulkPrice =
    amountBulkPrice !== undefined && feeBulkPrice !== undefined ? amountBulkPrice + feeBulkPrice : undefined;
  const feeIsInSameAsset = fee && amount?.id === fee.id;
  const totalAmount = feeIsInSameAsset ? amount?.add(fee?.baseUnits) : undefined;
  const totalAsset = feeIsInSameAsset ? amount.info : undefined;

  return (
    <div className={style.root}>
      <CostBreakdownRecipientRow label="Recipient" value={recipient} />
      <CostBreakdownValueRow
        label={amountLabel}
        cost={maybeBulkPriceStr(amountBulkPrice)}
        asset={amount?.info}
        value={amount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      <CostBreakdownValueRow
        label="Transaction Fee"
        cost={maybeBulkPriceStr(feeBulkPrice)}
        asset={fee?.info}
        value={fee?.format({ layer: feeDeductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!feeDeductionIsFromL1}
      />
      <CostBreakdownValueRow
        label="Total"
        cost={maybeBulkPriceStr(totalBulkPrice)}
        asset={totalAsset}
        value={totalAmount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      {investmentRowElement}
    </div>
  );
}

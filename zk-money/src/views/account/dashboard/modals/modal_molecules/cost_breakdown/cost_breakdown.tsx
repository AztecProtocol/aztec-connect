import { useAmountBulkPrice } from 'alt-model';
import { Amount } from 'alt-model/assets/amount';
import { getAssetIcon } from 'alt-model/known_assets/known_asset_display_data';
import { RemoteAsset } from 'alt-model/types';
import { formatBulkPrice } from 'app';
import { ShieldedAssetIcon } from 'components';
import style from './cost_breakdown.module.css';

export interface CostBreakdownInvestmentInfo {
  label: string;
  asset: RemoteAsset;
  formattedValue: React.ReactNode;
  formattedConversionValue?: React.ReactNode;
}

interface CostBreakdownProps {
  amountLabel: string;
  amount?: Amount;
  fee?: Amount;
  recipient: string;
  deductionIsFromL1?: boolean;
  feeDeductionIsFromL1?: boolean;
  investmentInfo?: CostBreakdownInvestmentInfo;
}

interface RecipientRowProps {
  label: string;
  value: string;
}

interface RowProps {
  label: string;
  cost?: string;
  asset?: RemoteAsset;
  value?: React.ReactNode;
  conversionValue?: React.ReactNode;
  assetIsZk?: boolean;
}

function renderIcon(assetIsZk?: boolean, asset?: RemoteAsset) {
  if (!asset) return;
  if (assetIsZk) {
    return <ShieldedAssetIcon size="s" asset={asset} />;
  } else {
    const src = getAssetIcon(asset.address);
    if (src) return <div className={style.l1AssetIcon} style={{ backgroundImage: `url(${src})` }} />;
  }
}

function RecipientRow({ label, value }: RecipientRowProps) {
  return (
    <div className={style.row}>
      <div className={style.title}>{label}</div>
      <div className={style.recipient}>{value}</div>
    </div>
  );
}

export function Row({ label, cost, asset, value, assetIsZk }: RowProps) {
  return (
    <div className={style.row}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={style.cost}>{cost}</div>
        <div className={style.assetIcon}>{renderIcon(assetIsZk, asset)}</div>
        <div className={style.amount}>{value}</div>
      </div>
    </div>
  );
}

export function InvestmentRow({ label, cost, asset, value, conversionValue, assetIsZk }: RowProps) {
  return (
    <div className={style.investmentRow}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={style.cost}>{cost}</div>
        <div className={style.assetIcon}>{renderIcon(assetIsZk, asset)}</div>
        <div className={style.amount}>
          <div>{value}</div>
          {conversionValue && <div className={style.conversionValue}>≈ {conversionValue}</div>}
        </div>
      </div>
    </div>
  );
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
  investmentInfo,
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
      <RecipientRow label="Recipient" value={recipient} />
      <Row
        label={amountLabel}
        cost={maybeBulkPriceStr(amountBulkPrice)}
        asset={amount?.info}
        value={amount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      <Row
        label="Transaction Fee"
        cost={maybeBulkPriceStr(feeBulkPrice)}
        asset={fee?.info}
        value={fee?.format({ layer: feeDeductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!feeDeductionIsFromL1}
      />
      <Row
        label="Total"
        cost={maybeBulkPriceStr(totalBulkPrice)}
        asset={totalAsset}
        value={totalAmount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      {investmentInfo && (
        <InvestmentRow
          asset={investmentInfo.asset}
          assetIsZk={true}
          label={investmentInfo.label}
          value={investmentInfo.formattedValue}
          conversionValue={investmentInfo.formattedConversionValue}
        />
      )}
    </div>
  );
}

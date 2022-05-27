import { EthAddress } from '@aztec/sdk';
import { useAmountBulkPrice } from 'alt-model';
import { Amount } from 'alt-model/assets/amount';
import { getAssetIcon } from 'alt-model/known_assets/known_asset_display_data';
import { formatBulkPrice } from 'app';
import { ShieldedAssetIcon } from 'components';
import style from './cost_breakdown.module.css';

interface CostBreakdownProps {
  amountLabel: string;
  amount?: Amount;
  fee?: Amount;
  recipient: string;
  deductionIsFromL1?: boolean;
  feeDeductionIsFromL1?: boolean;
  investmentLabel?: string;
  investmentReturn?: Amount;
}

interface RecipientRowProps {
  label: string;
  value: string;
}

interface RowProps {
  label: string;
  cost?: string;
  address?: EthAddress;
  value?: string;
  assetIsZk?: boolean;
}

function renderIcon(assetIsZk?: boolean, address?: EthAddress) {
  if (!address) return;
  if (assetIsZk) {
    return <ShieldedAssetIcon size="s" address={address} />;
  } else {
    const src = getAssetIcon(address);
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

export function Row({ label, cost, address, value, assetIsZk }: RowProps) {
  return (
    <div className={style.row}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={style.cost}>{cost}</div>
        <div className={style.assetIcon}>{renderIcon(assetIsZk, address)}</div>
        <div className={style.amount}>{value}</div>
      </div>
    </div>
  );
}

export function InvestmentRow({ label, cost, address, value, assetIsZk }: RowProps) {
  return (
    <div className={style.investmentRow}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={style.cost}>{cost}</div>
        <div className={style.assetIcon}>{renderIcon(assetIsZk, address)}</div>
        <div className={style.amount}>{value}</div>
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
  investmentLabel,
  investmentReturn,
}: CostBreakdownProps) {
  const amountBulkPrice = useAmountBulkPrice(amount);
  const feeBulkPrice = useAmountBulkPrice(fee);
  const totalBulkPrice =
    amountBulkPrice !== undefined && feeBulkPrice !== undefined ? amountBulkPrice + feeBulkPrice : undefined;
  const feeIsInSameAsset = fee && amount?.id === fee.id;
  const totalAmount = feeIsInSameAsset ? amount?.add(fee?.baseUnits) : undefined;
  const totalAddress = feeIsInSameAsset ? amount.address : undefined;

  return (
    <div className={style.root}>
      <RecipientRow label="Recipient" value={recipient} />
      <Row
        label={amountLabel}
        cost={maybeBulkPriceStr(amountBulkPrice)}
        address={amount?.address}
        value={amount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      <Row
        label="Transaction Fee"
        cost={maybeBulkPriceStr(feeBulkPrice)}
        address={fee?.address}
        value={fee?.format({ layer: feeDeductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!feeDeductionIsFromL1}
      />
      <Row
        label="Total"
        cost={maybeBulkPriceStr(totalBulkPrice)}
        address={totalAddress}
        value={totalAmount?.format({ layer: deductionIsFromL1 ? 'L1' : 'L2' })}
        assetIsZk={!deductionIsFromL1}
      />
      {investmentLabel && investmentReturn && (
        <InvestmentRow
          address={investmentReturn?.address}
          assetIsZk={true}
          label={investmentLabel}
          value={investmentReturn?.format({ layer: 'L1', uniform: true })}
        />
      )}
    </div>
  );
}

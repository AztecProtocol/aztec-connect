import { getAssetIcon } from '../../../../../../alt-model/known_assets/known_asset_display_data.js';
import { RemoteAsset } from '../../../../../../alt-model/types.js';
import { ShieldedAssetIcon } from '../../../../../../components/index.js';
import style from './cost_breakdown_rows.module.css';

function renderIcon(assetIsZk?: boolean, asset?: RemoteAsset) {
  if (!asset) return;
  if (assetIsZk) {
    return <ShieldedAssetIcon size="s" asset={asset} />;
  } else {
    const src = getAssetIcon(asset.label);
    if (src) return <div className={style.l1AssetIcon} style={{ backgroundImage: `url(${src})` }} />;
  }
}

interface CostBreakdownRecipientRowProps {
  label: string;
  value: string;
}

export function CostBreakdownRecipientRow({ label, value }: CostBreakdownRecipientRowProps) {
  return (
    <div className={style.row}>
      <div className={style.title}>{label}</div>
      <div className={style.recipient}>{value}</div>
    </div>
  );
}

interface CostBreakdownRowProps {
  label: string;
  cost?: string;
  asset?: RemoteAsset;
  value?: React.ReactNode;
  assetIsZk?: boolean;
}

export function CostBreakdownValueRow({ label, cost, asset, value, assetIsZk }: CostBreakdownRowProps) {
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

interface CostBreakdownInvestmentRowProps {
  label: string;
  cost?: string;
  asset?: RemoteAsset;
  value?: React.ReactNode;
  conversionValue?: React.ReactNode;
}

export function CostBreakdownInvestmentRow({
  label,
  cost,
  asset,
  value,
  conversionValue,
}: CostBreakdownInvestmentRowProps) {
  return (
    <div className={style.investmentRow}>
      <div className={style.title}>{label}</div>
      <div className={style.values}>
        <div className={style.cost}>{cost}</div>
        <div className={style.assetIcon}>{renderIcon(true, asset)}</div>
        <div className={style.amount}>
          <div>{value}</div>
          {conversionValue && <div className={style.conversionValue}>≈ {conversionValue}</div>}
        </div>
      </div>
    </div>
  );
}

interface CostBreakdownInvestmentRowTextOnlyProps {
  text?: string;
}

export function CostBreakdownInvestmentRowTextOnly({ text }: CostBreakdownInvestmentRowTextOnlyProps) {
  return (
    <div className={style.investmentRow}>
      <div className={style.text}>
        <div>{text}</div>
      </div>
    </div>
  );
}

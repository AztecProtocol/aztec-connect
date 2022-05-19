import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import type { RemoteAsset } from 'alt-model/types';
import { formatBaseUnits } from 'app';
import { Checkbox } from 'components';
import style from './disclaimer.module.scss';

interface DisclaimerProps {
  transactionLimit: bigint;
  asset?: RemoteAsset;
  accepted: boolean;
  onChangeAccepted: (accepted: boolean) => void;
}

export function Disclaimer({ transactionLimit, asset, accepted, onChangeAccepted }: DisclaimerProps) {
  const assetStr = asset
    ? `${formatBaseUnits(transactionLimit, asset.decimals, {
        precision: getAssetPreferredFractionalDigits(asset.address),
        commaSeparated: true,
      })} ${asset.symbol}`
    : '';
  return (
    <div className={style.root}>
      <div className={style.header}>
        <div className={style.title}>Disclaimer</div>
        <div className={style.icon} />
      </div>
      <div>
        <div
          className={style.message}
        >{`This is experimental software that hasn’t yet been externally audited. Your private key is stored in the browser, for security amounts are capped at ${assetStr}. Use at your own risk.`}</div>
      </div>
      <div className={style.checkboxRow}>
        <div>I understand the risks</div>
        <Checkbox checked={accepted} onChangeValue={onChangeAccepted} />
      </div>
    </div>
  );
}

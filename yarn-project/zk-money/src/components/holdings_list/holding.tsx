import type { AssetValue } from '@aztec/sdk';
import { SkeletonRect, Button, ButtonTheme, ButtonSize } from '../../ui-components/index.js';
import { formatBulkPrice } from '../../app/index.js';
import { useAmountBulkPrice, useSpendableBalance } from '../../alt-model/index.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { ShieldedAssetIcon } from '../index.js';
import { SHIELDABLE_ASSET_ADDRESSES } from '../../alt-model/known_assets/known_asset_addresses.js';
import { useAmount } from '../../alt-model/asset_hooks.js';
import { Amount } from '../../alt-model/assets/index.js';
import { getIsDust } from '../../alt-model/assets/asset_helpers.js';
import { useWalletInteractionIsOngoing } from '../../alt-model/wallet_interaction_hooks.js';
import { useAccountState } from '../../alt-model/account_state/account_state_hooks.js';
import style from './holding.module.scss';

interface HoldingProps {
  assetValue: AssetValue;
  onSend?: (asset: RemoteAsset) => void;
  onShield?: (asset: RemoteAsset) => void;
  onGoToEarn?: (asset: RemoteAsset) => void;
}

export function Holding({ assetValue, onSend, onShield, onGoToEarn }: HoldingProps) {
  const amount = useAmount(assetValue);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const asset = amount?.info;
  const spendableBalance = useSpendableBalance(assetValue.assetId);
  const accountState = useAccountState();
  const isSynced = accountState && !accountState.isSyncing;

  const spendableAmount = spendableBalance && asset ? new Amount(spendableBalance, asset) : undefined;
  const spendableBalanceIsDust =
    !spendableAmount || (asset ? getIsDust(spendableAmount.toAssetValue(), asset) : undefined);
  const bulkPrice = useAmountBulkPrice(amount);
  const shieldSupported = SHIELDABLE_ASSET_ADDRESSES.some(x => asset?.address.equals(x));
  const spendableFormatted =
    (spendableAmount?.toFloat() ?? 0) > 0 ? spendableAmount?.format({ hideSymbol: true, uniform: true }) : '0';

  if (!asset) {
    return null;
  }

  return (
    <div className={style.holdingWrapper}>
      <ShieldedAssetIcon asset={asset} />
      <div className={style.assetWrapper}>
        <div className={style.holdingUnits}>{amount.format({ uniform: true })}</div>
        <div className={style.spendable}>{`${spendableFormatted} available`}</div>
      </div>
      <div className={style.holdingAmount}>
        {bulkPrice ? `$${formatBulkPrice(bulkPrice)}` : <SkeletonRect sizingContent="$1000.00" />}
      </div>

      <div className={style.buttonsWrapper}>
        {shieldSupported && (
          <Button
            className={style.button}
            theme={ButtonTheme.Secondary}
            size={ButtonSize.Medium}
            onClick={() => onShield?.(asset)}
            text={'Shield'}
            disabled={walletInteractionIsOngoing || !isSynced}
          />
        )}
        {!spendableBalanceIsDust && (
          <>
            <Button
              className={style.button}
              onClick={() => onSend?.(asset)}
              size={ButtonSize.Medium}
              theme={ButtonTheme.Secondary}
              text={'Send'}
              disabled={walletInteractionIsOngoing || !isSynced}
            />
            <Button
              className={style.button}
              onClick={() => onGoToEarn?.(asset)}
              theme={ButtonTheme.Secondary}
              size={ButtonSize.Medium}
              text={'Earn'}
              disabled={walletInteractionIsOngoing || !isSynced}
            />
          </>
        )}
      </div>
    </div>
  );
}

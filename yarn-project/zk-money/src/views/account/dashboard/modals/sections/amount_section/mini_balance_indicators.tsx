import type { RemoteAsset } from '../../../../../../alt-model/types.js';
import { getAssetPreferredFractionalDigits } from '../../../../../../alt-model/known_assets/known_asset_display_data.js';
import { formatBaseUnits } from '../../../../../../app/index.js';
import { useL1Balances } from '../../../../../../alt-model/assets/l1_balance_hooks.js';
import { useMaxSpendableValue } from '../../../../../../alt-model/index.js';

export function useL1BalanceIndicator(asset?: RemoteAsset, symbol: boolean = false) {
  const { l1Balance } = useL1Balances(asset);
  return asset === undefined || l1Balance === undefined
    ? 'Loading...'
    : `${formatBaseUnits(l1Balance, asset.decimals, {
        precision: getAssetPreferredFractionalDigits(asset.address),
      })}${symbol ? ` ${asset.symbol}` : ''}`;
}

export function useL2BalanceIndicator(asset?: RemoteAsset, symbol: boolean = false) {
  const balance = useMaxSpendableValue(asset?.id);
  return asset === undefined || balance === undefined
    ? 'Loading...'
    : `${formatBaseUnits(balance, asset.decimals, {
        precision: getAssetPreferredFractionalDigits(asset.address),
      })}${symbol ? ` zk${asset.symbol}` : ''}`;
}

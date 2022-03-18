import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { formatBaseUnits } from 'app';
import { Text } from 'components';
import { useL1Balances } from 'alt-model/assets/l1_balance_hooks';
import { useBalance } from 'alt-model';

export function MiniL1BalanceIndicator({ asset }: { asset: RemoteAsset }) {
  const { l1Balance } = useL1Balances(asset);
  const content =
    l1Balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(l1Balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} ${asset.symbol}`;
  return <Text text={content} size="xxs" />;
}

export function MiniL2BalanceIndicator({ asset }: { asset: RemoteAsset }) {
  const balance = useBalance(asset.id);
  const content =
    balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} zk${asset.symbol}`;
  return <Text text={content} size="xxs" />;
}

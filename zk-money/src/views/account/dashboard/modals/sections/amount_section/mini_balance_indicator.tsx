import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { useBalance } from 'alt-model';
import { formatBaseUnits } from 'app';
import { Text } from 'components';

export function MiniBalanceIndicator({ asset }: { asset: RemoteAsset }) {
  const balance = useBalance(asset.id);
  const content =
    balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} zk${asset.symbol}`;
  return <Text text={content} size="xxs" />;
}

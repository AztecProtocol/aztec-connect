import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { formatBaseUnits } from 'app';
import { Text } from 'components';
import { useL1Balances } from 'alt-model/assets/l1_balance_hooks';
import { useMaxSpendableValue } from 'alt-model';

export function MiniL1BalanceIndicator({ asset }: { asset?: RemoteAsset }) {
  const { l1Balance } = useL1Balances(asset);
  const content =
    asset === undefined || l1Balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(l1Balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} ${asset.symbol}`;
  return (
    <Text size="xxs">
      <div>Available Balance: </div>
      <div>{content}</div>
    </Text>
  );
}

export function MiniL2BalanceIndicator({ asset }: { asset?: RemoteAsset }) {
  const balance = useMaxSpendableValue(asset?.id);
  const content =
    asset === undefined || balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} zk${asset.symbol}`;
  return <Text size="xxs">Available Balance: {content}</Text>;
}

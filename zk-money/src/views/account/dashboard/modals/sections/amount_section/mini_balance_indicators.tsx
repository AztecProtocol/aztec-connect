import type { RemoteAsset } from 'alt-model/types';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { formatBaseUnits } from 'app';
import { Text } from 'components';
import { useL1Balances } from 'alt-model/assets/l1_balance_hooks';
import { useMaxSpendableValue } from 'alt-model';
import style from './mini_balance_indicators.module.scss';

export function MiniL1BalanceIndicator({ asset }: { asset?: RemoteAsset }) {
  const { l1Balance } = useL1Balances(asset);
  const content =
    asset === undefined || l1Balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(l1Balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} ${asset.symbol}`;
  return <BalanceIndicator availableBalance={content} />;
}

export function MiniL2BalanceIndicator({ asset }: { asset?: RemoteAsset }) {
  const balance = useMaxSpendableValue(asset?.id);
  const content =
    asset === undefined || balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(balance, asset.decimals, {
          precision: getAssetPreferredFractionalDigits(asset.address),
        })} zk${asset.symbol}`;
  return <BalanceIndicator availableBalance={content} />;
}

function BalanceIndicator({ availableBalance }: { availableBalance: string }) {
  return (
    <Text size="xxs" className={style.balanceIndicator}>
      <div>Available Balance</div>
      <div>{availableBalance}</div>
    </Text>
  );
}

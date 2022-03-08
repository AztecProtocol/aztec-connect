import { useBalance } from 'alt-model';
import { Asset, formatBaseUnits } from 'app';
import { Text } from 'components';

export function MiniBalanceIndicator({ asset }: { asset: Asset }) {
  const balance = useBalance(asset.id);
  const content =
    balance === undefined
      ? 'Loading...'
      : `${formatBaseUnits(balance, asset.decimals, { precision: asset.preferredFractionalDigits })} zk${asset.symbol}`;
  return <Text text={content} size="xxs" />;
}

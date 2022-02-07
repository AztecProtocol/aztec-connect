import { Asset } from '../../../../app';
import { Text } from '../../../../components';
import { CrowdVisualisation } from '../../privacy/crowd_visualisation';

export function Privacy({ asset }: { asset: Asset }) {
  return (
    <>
      <Text size="xs">
        This transaction hides amongst{' '}
        <Text inline italic weight="bold">
          2578
        </Text>{' '}
        users who have zk{asset.symbol} on Aztec
      </Text>
      <CrowdVisualisation size={100} />
    </>
  );
}

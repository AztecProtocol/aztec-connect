import type { RemoteAsset } from 'alt-model/types';
import styled from 'styled-components';
import { Text } from 'components';
import { CrowdVisualisation } from 'views/account/privacy/crowd_visualisation';

const StyledText = styled(Text)`
  text-align: center;
`;

export function Privacy({ asset, className }: { asset: RemoteAsset; className?: string }) {
  return (
    <div className={className}>
      <StyledText size="xs">
        This transaction hides amongst{' '}
        <Text inline italic weight="bold">
          2578
        </Text>{' '}
        users who have zk{asset.symbol} on Aztec
      </StyledText>
      <CrowdVisualisation size={100} />
    </div>
  );
}

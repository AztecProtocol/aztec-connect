import styled from 'styled-components';
import { Asset } from '../../../../app';
import { Text } from '../../../../components';
import { CrowdVisualisation } from '../../privacy/crowd_visualisation';

const StyledText = styled(Text)`
  text-align: center;
`;

export function Privacy({ asset }: { asset: Asset }) {
  return (
    <>
      <StyledText size="xs">
        This transaction hides amongst{' '}
        <Text inline italic weight="bold">
          2578
        </Text>{' '}
        users who have zk{asset.symbol} on Aztec
      </StyledText>
      <CrowdVisualisation size={100} />
    </>
  );
}

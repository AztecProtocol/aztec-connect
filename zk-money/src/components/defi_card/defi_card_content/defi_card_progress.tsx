import styled from 'styled-components/macro';
import { BridgeCountDown } from 'features/defi/bridge_count_down';
import { colours } from '../../../styles';

const CardProgress = styled.div`
  width: 100%;
  padding: 0 40px 20px 40px;
  border-bottom: 1px solid ${colours.greyDark};
`;

export const DefiCardProgress = () => {
  return (
    <CardProgress>
      <BridgeCountDown totalSlots={24} takenSlots={12} nextBatch={new Date(Date.now() + 1000 * 60 * 22)} />
    </CardProgress>
  );
};

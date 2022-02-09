import styled from 'styled-components/macro';
import { borderRadiuses, colours, gradients } from '../../../styles';

const CardProgress = styled.div`
  display: flex;
  font-style: italic;
  flex-direction: column;
  font-size: 14px;
  width: 100%;
  justify-content: space-between;
  padding: 0 40px 20px 40px;
  border-bottom: 1px solid ${colours.greyDark};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  border-radius: ${borderRadiuses.s};
  background-color: ${colours.pink};
  position: relative;
  overflow: hidden;
`;

const CardProgressInfo = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 15px;
  justify-content: space-between;
  letter-spacing: 0.5px;
`;

const ProgressBarCompletion = styled.div`
  width: 50%;
  background: linear-gradient(
    101.14deg,
    ${gradients.primary.from} 11.12%,
    ${gradients.primary.to} 58.22%,
    ${gradients.primary.to} 58.22%
  );
  width: 50%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

export const DefiCardProgress = () => {
  return (
    <CardProgress>
      <CardProgressInfo>
        <div>Next Batch: ~22 mins</div>
        <div>12 slots remaining!</div>
      </CardProgressInfo>
      <ProgressBar>
        <ProgressBarCompletion />
      </ProgressBar>
    </CardProgress>
  );
};

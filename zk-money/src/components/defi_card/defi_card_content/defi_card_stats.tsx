import styled from 'styled-components/macro';
import { colours } from '../../../styles';

const CardStats = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  display: flex;
  text-align: center;
  justify-content: space-around;
  border-top: 1px solid ${colours.greyDark};
  padding: 20px 40px;
`;

const CardStatTitle = styled.div`
  font-size: 10px;
  font-weight: 200;
  text-transform: uppercase;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
`;

const CardStatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  display: flex;
  justify-content: center;
`;

const CardStat = styled.div`
  width: 33%;
`;

export const DefiCardStats = () => {
  return (
    <CardStats>
      <CardStat>
        <CardStatTitle>Current Yield</CardStatTitle>
        <CardStatValue>4.56%</CardStatValue>
      </CardStat>
      <CardStat>
        <CardStatTitle>L1 Liquidity</CardStatTitle>
        <CardStatValue>$10Bn</CardStatValue>
      </CardStat>
      <CardStat>
        <CardStatTitle>Batch Size</CardStatTitle>
        <CardStatValue>$150k</CardStatValue>
      </CardStat>
    </CardStats>
  );
};

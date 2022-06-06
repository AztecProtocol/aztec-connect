import { Button as _Button, Modal } from '../../components';
import styled from 'styled-components/macro';

export const IncentiveModal = styled(Modal)`
  width: 50vw !important;
`;

export const IncentiveModalWrapper = styled.div`
  background-color: white;
  height: 600px;
  padding: 40px;
  justify-content: space-between;
  display: flex;
  flex-direction: column;
  color: #20293e;
  position: relative;
  overflow: hidden;
  @media (max-width: 1200px) {
    height: 700px;
  }
  @media (max-width: 1050px) {
    overflow: auto;
    height: 750px;
  }
`;

export const Background = styled.img`
  height: 100%;
  top: 0;
  right: 0;
  position: absolute;
`;

export const Close = styled.img`
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 10px;
  height: 60px;
  width: 60px;
  cursor: pointer;
`;

export const Text = styled.div`
  display: flex;
  gap: 30px;
  position: absolute;
  flex-direction: column;
`;

export const TextLink = styled.a`
  font-weight: 500;
`;

export const Title = styled.div`
  font-size: 34px;
  font-weight: 450;
  line-height: 120%;
  letter-spacing: 0.05em;
  padding-right: 30%;
`;

export const Body = styled.div`
  padding-right: 25%;
  letter-spacing: 0.05em;
  font-size: 16px;
  line-height: 130%;
`;

export const Button = styled(_Button)`
  position: absolute;
  right: 30px;
  bottom: 30px;
`;

export const Body2 = styled(Body)`
  padding-right: 35%;
`;

export const StepsHeading = styled.div`
  font-weight: 500;
  font-size: 16px;
`;

export const Steps = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

export const Step = styled.div`
  @media (max-width: 1050px) {
    display: flex;
    gap: 10px;
  }
`;

export const StepHeading = styled.div`
  font-size: 19px;
  font-weight: 500;
  margin-bottom: 5px;
`;

export const StepText = styled.div`
  font-size: 14px;
  line-height: 150%;
  margin-bottom: 20px;
`;

export const HeaderOverlay = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
`;

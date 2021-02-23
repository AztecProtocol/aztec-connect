import React from 'react';
import styled from 'styled-components';
import { rgba } from 'polished';
import { colours, defaultTextColour, fontSizes, spacings } from '../styles';

const activeBackground = colours.white;
const inactiveBackground = rgba(colours.white, 0.2);

const Root = styled.div`
  display: flex;
  align-items: center;
`;

interface StepProps {
  active: boolean;
}

const Step = styled.div<StepProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${spacings.m};
  height: ${spacings.m};
  border-radius: 100%;
  font-size: ${fontSizes.xxs};
  cursor: default;
  ${({ active }) => {
    if (active) {
      return `
        background: ${activeBackground};
        color: ${colours[defaultTextColour]};
      `;
    }
    return `
      background: ${inactiveBackground};
      color: ${colours.white};
    `;
  }}
`;

interface LineProps {
  active: boolean;
}

const Line = styled.div<LineProps>`
  width: 80px;
  height: 2px;
  background: ${({ active }) => (active ? activeBackground : inactiveBackground)};
`;

interface StepsProps {
  totalSteps: number;
  currentStep: number;
}

export const Steps: React.FunctionComponent<StepsProps> = ({ totalSteps, currentStep }) => {
  const stepNodes: JSX.Element[] = [];
  for (let i = 0; i < totalSteps; ++i) {
    const active = i < currentStep;
    if (i > 0) {
      stepNodes.push(<Line key={`line-${i}`} active={active} />);
    }
    stepNodes.push(
      <Step key={`step-${i}`} active={active}>
        {i + 1}
      </Step>,
    );
  }

  return <Root>{stepNodes}</Root>;
};

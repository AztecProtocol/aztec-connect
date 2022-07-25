import React from 'react';
import styled from 'styled-components/macro';
import { Dot, PaddedBlock, Text } from '../../components';
import { borderRadiuses, spacings } from '../../styles';

export interface Step {
  step: string | number;
  title: React.ReactNode;
}

const Root = styled.div`
  padding: ${spacings.m} ${spacings.xxl};
  border-radius: ${borderRadiuses.s};
  background: rgba(255, 255, 255, 0.1);
`;

const StepRoot = styled(PaddedBlock)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.xs} 0;
`;

const IconRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  flex-shrink: 0;
`;

interface StepNameProps {
  active: boolean;
}

const StepName = styled(Text)<StepNameProps>`
  min-width: 304px;
  padding-right: ${spacings.s};
  white-space: nowrap;
  ${({ active }) => !active && 'opacity: 0.5;'};
`;

interface ProgressProps {
  currentStep: string | number;
  steps: Step[];
}

export const Progress: React.FunctionComponent<ProgressProps> = ({ currentStep, steps }) => (
  <Root>
    {steps.map(({ step, title }) => {
      return (
        <StepRoot key={step}>
          <StepName active={step <= currentStep}>{title}</StepName>
          {/* We could (should?) display a loader or an alert when there's an error */}
          <IconRoot>{step < currentStep && <Dot color="white" size="xs" />}</IconRoot>
        </StepRoot>
      );
    })}
  </Root>
);

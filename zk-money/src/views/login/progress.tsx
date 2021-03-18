import React from 'react';
import styled from 'styled-components';
import { LoginStep, WorldState } from '../../app';
import { Dot, Loader, LoaderTheme, PaddedBlock, ProgressHandler, Text } from '../../components';
import errorIcon from '../../images/exclamation_mark.svg';
import { borderRadiuses, spacings } from '../../styles';

interface Step {
  step: LoginStep;
  title: string;
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

const Icon = styled.img`
  height: 20px;
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
  currentStep: LoginStep;
  worldState: WorldState;
  steps: Step[];
  active: boolean;
  failed: boolean;
}

export const Progress: React.FunctionComponent<ProgressProps> = ({
  currentStep,
  worldState,
  steps,
  active,
  failed,
}) => (
  <Root>
    {steps.map(({ step, title }) => {
      const isCurrentStep = step === currentStep;
      let titleText: React.ReactNode = title;
      if (isCurrentStep && step === LoginStep.SYNC_DATA) {
        titleText = (
          <ProgressHandler worldState={worldState}>{progress => <>{`${title} (${progress}%)`}</>}</ProgressHandler>
        );
      }
      return (
        <StepRoot key={step}>
          <StepName size={isCurrentStep && active ? 'm' : 's'} active={step <= currentStep}>
            {titleText}
          </StepName>
          <IconRoot>
            {isCurrentStep && active && <Loader theme={LoaderTheme.WHITE} />}
            {isCurrentStep && failed && <Icon src={errorIcon} />}
            {step < currentStep && <Dot color="white" size="xs" />}
          </IconRoot>
        </StepRoot>
      );
    })}
  </Root>
);

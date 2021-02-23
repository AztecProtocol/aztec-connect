import React from 'react';
import styled from 'styled-components';
import { LoginStep, WorldState } from '../../app';
import { PaddedBlock, Text, Dot, Loader, LoaderTheme } from '../../components';
import errorIcon from '../../images/exclamation_mark.svg';
import { spacings, borderRadiuses } from '../../styles';

const calculateProgress = ({ latestRollup, accountSyncedToRollup }: WorldState) => {
  if (latestRollup <= 0) {
    return 0;
  }

  return Math.max(0, accountSyncedToRollup) / latestRollup;
};

const loginSteps = [
  {
    step: LoginStep.INIT_SDK,
    title: 'Creating Encryption Keys',
  },
  {
    step: LoginStep.ADD_ACCOUNT,
    title: 'Logging In',
  },
  {
    step: LoginStep.SYNC_DATA,
    title: 'Syncing Account Data',
  },
];

const signupSteps = [
  {
    step: LoginStep.INIT_SDK,
    title: 'Encrypting Data',
  },
  {
    step: LoginStep.CREATE_ACCOUNT,
    title: 'Creating Registration Proof',
  },
  {
    step: LoginStep.SYNC_DATA,
    title: 'Syncing Account Data',
  },
];

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
  isNewAccount: boolean;
  active: boolean;
  failed: boolean;
}

export const Progress: React.FunctionComponent<ProgressProps> = ({
  currentStep,
  worldState,
  isNewAccount,
  active,
  failed,
}) => {
  const steps = isNewAccount ? signupSteps : loginSteps;

  return (
    <Root>
      {steps.map(({ step, title }) => {
        const isCurrentStep = step === currentStep;
        let titleText = title;
        if (isCurrentStep && step === LoginStep.SYNC_DATA) {
          const progress = calculateProgress(worldState);
          titleText = `${title} (${Math.floor(progress * 100)}%)`;
        }
        return (
          <StepRoot key={step}>
            <StepName text={titleText} size={isCurrentStep && active ? 'm' : 's'} active={step <= currentStep} />
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
};

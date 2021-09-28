import React from 'react';
import { LoginStep, WorldState } from '../../app';
import { ProgressHandler } from '../../components';
import { Progress, Step } from './progress';

interface InitDataFormProps {
  currentStep: LoginStep;
  worldState: WorldState;
  steps: Step[];
  active: boolean;
  failed: boolean;
}

export const InitDataForm: React.FunctionComponent<InitDataFormProps> = ({
  currentStep,
  worldState,
  steps,
  active,
  failed,
}) => {
  const stepsWithStatus = steps.map(({ step, title }) => {
    let titleText = title;
    if (currentStep === LoginStep.SYNC_DATA && step === LoginStep.SYNC_DATA) {
      titleText = (
        <ProgressHandler worldState={worldState}>{progress => <>{`${title} (${progress}%)`}</>}</ProgressHandler>
      );
    }
    return {
      step,
      title: titleText,
    };
  });
  return <Progress currentStep={currentStep} steps={stepsWithStatus} active={active} failed={failed} />;
};

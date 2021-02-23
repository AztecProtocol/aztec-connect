import React from 'react';
import styled from 'styled-components';
import { PaddedBlock, Steps, Text } from '../../components';
import backIcon from '../../images/chevron_left_white.svg';
import { borderRadiuses, breakpoints, spacings } from '../../styles';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${spacings.xxl};
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0px 1px 3px rgba(255, 255, 255, 0.1);
  border-radius: ${borderRadiuses.m};

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.l};
    border-radius: 0;
    min-height: calc(100vh - 120px);
  }
`;

const StepsRoot = styled(PaddedBlock)`
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;

  @media (max-width: ${breakpoints.s}) {
    display: none;
  }
`;

const BackButtonHead = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  cursor: pointer;
`;

const BackButtonFoot = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding-top: ${spacings.m};

  @media (min-width: ${parseInt(breakpoints.s) + 1}px) {
    display: none;
  }
`;

const BackIcon = styled.img`
  height: 40px;

  @media (max-width: ${breakpoints.s}) {
    height: 24px;
  }
`;

const BackText = styled(Text)`
  padding: ${spacings.s};
`;

const TitleRoot = styled(PaddedBlock)`
  text-align: center;
`;

const Description = styled(PaddedBlock)`
  max-width: 600px;
  text-align: center;

  @media (max-width: ${breakpoints.s}) {
    padding-top: 0;
  }
`;

const PopupContent = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
  width: 100%;
`;

interface LoginTemplateProps {
  totalSteps: number;
  currentStep: number;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  children: React.ReactNode;
  onRestart?(): void;
}

export const LoginTemplate: React.FunctionComponent<LoginTemplateProps> = ({
  totalSteps,
  currentStep,
  title,
  description,
  children,
  onRestart,
}) => (
  <Root>
    <StepsRoot size="m">
      {!!onRestart && (
        <BackButtonHead onClick={onRestart} title="Change wallet">
          <BackIcon src={backIcon} />
        </BackButtonHead>
      )}
      <Steps totalSteps={totalSteps} currentStep={currentStep} />
    </StepsRoot>
    <TitleRoot>
      <Text size="xl">{title}</Text>
    </TitleRoot>
    <Description>
      <Text size="s">{description}</Text>
    </Description>
    <PopupContent size="m">{children}</PopupContent>
    {!!onRestart && (
      <BackButtonFoot onClick={onRestart}>
        <BackIcon src={backIcon} />
        <BackText text="Change wallet" size="s" />
      </BackButtonFoot>
    )}
  </Root>
);

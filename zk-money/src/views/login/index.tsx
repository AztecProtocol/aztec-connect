import React from 'react';
import styled from 'styled-components';
import { ValueAvailability, LoginStep, MessageType, Wallet, WorldState, SystemMessage } from '../../app';
import { Text } from '../../components';
import { breakpoints, spacings } from '../../styles';
import { AliasForm } from './alias_form';
import { Connect } from './connect';
import { LoginTemplate } from './login_template';
import { Progress } from './progress';
import { SeedPhraseForm } from './seed_phrase_form';

const PaddedTop = styled.div`
  padding-top: ${spacings.m};
`;

interface LoginStepInfo {
  step: number;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
}

const loginSteps: LoginStepInfo[] = [
  {
    step: 1,
    title: (
      <>
        {'Pick '}
        <Text text="your" weight="bold" inline />
        {' wallet'}
      </>
    ),
    description: (
      <>
        {'Your wallet is used to derive a private key, used encrypt your data and sign private transactions.'}
        <PaddedTop>{'More coming soon!'}</PaddedTop>
      </>
    ),
  },
  {
    step: 1,
    title: (
      <>
        {'Enter your '}
        <Text text="seed phrase" weight="bold" inline />
      </>
    ),
    description: `Hot wallets can not be re-generated, make sure you store your seed phrase or you will loose access to your assets.`,
  },
  {
    step: 2,
    title: (
      <>
        {'Enter your '}
        <Text text="username" weight="bold" inline />
      </>
    ),
    description: `Please enter the username you used to register your zk.money account.`,
  },
  {
    step: 3,
    title: (
      <>
        {'Logging '}
        <Text text="you" weight="bold" inline />
        {' in...'}
      </>
    ),
    description: `This may take several minutes, please don’t close the window.`,
  },
];

const signupSteps: LoginStepInfo[] = [
  loginSteps[0],
  loginSteps[1],
  {
    step: 2,
    title: (
      <>
        {'Pick a '}
        <Text text="username" weight="bold" inline />
      </>
    ),
    description: `Your username makes it simple for your friends to send you crypto. It lets them look up your end-to-end encryption keys so rest of the world can’t snoop on your data 👀`,
  },
  {
    step: 3,
    title: (
      <>
        {'Creating '}
        <Text text="your" weight="bold" inline />
        {' account...'}
      </>
    ),
    description: `This may take several minutes, please don’t close the window.`,
  },
];

const getStepInfo = (step: LoginStep, isNewAccount: boolean) => {
  const steps = isNewAccount ? signupSteps : loginSteps;
  switch (step) {
    case LoginStep.CONNECT_WALLET:
      return steps[0];
    case LoginStep.SET_SEED_PHRASE:
      return steps[1];
    case LoginStep.SET_ALIAS:
      return steps[2];
    default:
      return steps[3];
  }
};

const Root = styled.div`
  padding-bottom: ${spacings.xxl};

  @media (max-width: ${breakpoints.s}) {
    margin: 0 -${spacings.m};
    padding-bottom: 0;
  }
`;

interface LoginProps {
  currentStep: LoginStep;
  worldState: WorldState;
  wallet?: Wallet;
  seedPhrase: string;
  alias: string;
  aliasAvailability: ValueAvailability;
  rememberMe: boolean;
  isNewAccount: boolean;
  systemMessage: SystemMessage;
  setSeedPhrase: (seedPhrase: string) => void;
  setAlias: (alias: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  onSelectWallet: (wallet: Wallet) => void;
  onRestart?: () => void;
  onSelectSeedPhrase: (seedPhrase: string) => void;
  onSelectAlias: (alias: string) => void;
}

export const Login: React.FunctionComponent<LoginProps> = ({
  currentStep,
  worldState,
  wallet,
  seedPhrase,
  alias,
  aliasAvailability,
  rememberMe,
  isNewAccount,
  systemMessage,
  setSeedPhrase,
  setAlias,
  setRememberMe,
  onSelectWallet,
  onSelectSeedPhrase,
  onRestart,
  onSelectAlias,
}) => {
  const { step, title, description } = getStepInfo(currentStep, isNewAccount);
  const { message, type: messageType } = systemMessage;

  return (
    <Root>
      <LoginTemplate totalSteps={3} currentStep={step} title={title} description={description} onRestart={onRestart}>
        {(() => {
          switch (currentStep) {
            case LoginStep.CONNECT_WALLET:
              return <Connect wallet={wallet} onSubmit={onSelectWallet} />;
            case LoginStep.SET_SEED_PHRASE:
              return (
                <SeedPhraseForm seedPhrase={seedPhrase} setSeedPhrase={setSeedPhrase} onSubmit={onSelectSeedPhrase} />
              );
            case LoginStep.SET_ALIAS:
              return (
                <AliasForm
                  alias={alias}
                  aliasAvailability={aliasAvailability}
                  rememberMe={rememberMe}
                  setAlias={setAlias}
                  setRememberMe={setRememberMe}
                  onSubmit={onSelectAlias}
                  isNewAccount={isNewAccount}
                />
              );
            default:
              return (
                <Progress
                  currentStep={currentStep}
                  worldState={worldState}
                  isNewAccount={isNewAccount}
                  active={!message || messageType === MessageType.TEXT}
                  failed={!!message && messageType === MessageType.ERROR}
                />
              );
          }
        })()}
      </LoginTemplate>
    </Root>
  );
};

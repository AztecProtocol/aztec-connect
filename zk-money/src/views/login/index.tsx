import React from 'react';
import styled from 'styled-components';
import {
  DepositFormValues,
  LoginState,
  LoginStep,
  MessageType,
  ProviderState,
  SystemMessage,
  Wallet,
  WorldState,
} from '../../app';
import { Text, TextLink } from '../../components';
import { breakpoints, spacings } from '../../styles';
import { AliasForm } from './alias_form';
import { Connect } from './connect';
import { DepositForm } from './deposit_form';
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
        {
          'Your wallet is used to derive a private key, which is used to encrypt your data and sign private transactions.'
        }
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
    description: `Hot wallets can not be re-generated, make sure you store your seed phrase or you will lose access to your assets.`,
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
    description: `Your username makes it simple for your friends to send you crypto. It lets them look up your end-to-end encryption keys, so the rest of the world can’t snoop on your data 👀`,
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
  {
    step: 4,
    title: (
      <>
        {'Restoring '}
        <Text text="your" weight="bold" inline />
        {' account...'}
      </>
    ),
    description: `Looks like you have tried to register before. We are restoring your account to see if you can still claim your desired username.`,
  },
  {
    step: 4,
    title: 'Deposit ETH', // TODO - Could be other assets.
    description: `In order to prevent spam, you must deposit at the same time as claiming a username. Please deposit at least 0.01 ETH.`,
  },
];

const busyStepInfo = (step: number, explorerUrl: string): LoginStepInfo => ({
  step,
  title: 'We are busy',
  description: (
    <>
      {'There are too many transactions in the queue ahead of you. Please check back later and try again.'}
      <PaddedTop>
        <Text size="s">
          {'In the meantime, check out the '}
          <TextLink
            text="block explorer"
            href={explorerUrl}
            color="white"
            weight="bold"
            target="_blank"
            underline
            inline
          />
          {' for live status updates.'}
        </Text>
      </PaddedTop>
    </>
  ),
});

const loginProgresses = [
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

const signupProgresses = [
  {
    step: LoginStep.INIT_SDK,
    title: 'Encrypting Data',
  },
  {
    step: LoginStep.CREATE_ACCOUNT,
    title: 'Creating Registration Proof',
  },
];

const recoveringProgresses = [
  {
    step: LoginStep.VALIDATE_DATA,
    title: 'Encrypting Data',
  },
  {
    step: LoginStep.RECOVER_ACCOUNT_PROOF,
    title: 'Restoring Registration Proof',
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
    case LoginStep.VALIDATE_DATA:
    case LoginStep.RECOVER_ACCOUNT_PROOF:
      return steps[4];
    case LoginStep.CLAIM_USERNAME:
      return steps[5];
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
  worldState: WorldState;
  loginState: LoginState;
  providerState?: ProviderState;
  depositForm?: DepositFormValues;
  isNewAccount: boolean;
  explorerUrl: string;
  systemMessage: SystemMessage;
  setSeedPhrase: (seedPhrase: string) => void;
  setAlias: (alias: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  onSelectWallet: (wallet: Wallet) => void;
  onRestart?: () => void;
  onSelectSeedPhrase: (seedPhrase: string) => void;
  onSelectAlias: (alias: string) => void;
  onDepositFormInputsChange(inputs: Partial<DepositFormValues>): void;
  onSubmitDepositForm(): void;
  onChangeWallet(wallet: Wallet): void;
}

export const Login: React.FunctionComponent<LoginProps> = ({
  worldState,
  loginState,
  providerState,
  depositForm,
  isNewAccount,
  explorerUrl,
  systemMessage,
  setSeedPhrase,
  setAlias,
  setRememberMe,
  onSelectWallet,
  onSelectSeedPhrase,
  onRestart,
  onSelectAlias,
  onDepositFormInputsChange,
  onSubmitDepositForm,
  onChangeWallet,
}) => {
  const { step: currentStep, wallet, seedPhrase, alias, aliasAvailability, rememberMe, allowToProceed } = loginState;
  const { step, title, description } = allowToProceed
    ? getStepInfo(currentStep, isNewAccount)
    : busyStepInfo(currentStep, explorerUrl);
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
                <SeedPhraseForm
                  seedPhrase={seedPhrase}
                  setSeedPhrase={setSeedPhrase}
                  onSubmit={onSelectSeedPhrase}
                  hasError={!!message && messageType === MessageType.ERROR}
                />
              );
            case LoginStep.SET_ALIAS:
              return (
                <AliasForm
                  alias={alias}
                  aliasAvailability={aliasAvailability}
                  rememberMe={rememberMe}
                  allowToProceed={allowToProceed}
                  setAlias={setAlias}
                  setRememberMe={setRememberMe}
                  onSubmit={onSelectAlias}
                  onRestart={onRestart!}
                  isNewAccount={isNewAccount}
                />
              );
            case LoginStep.CLAIM_USERNAME:
              return (
                <DepositForm
                  providerState={providerState}
                  form={depositForm!}
                  onChangeInputs={onDepositFormInputsChange}
                  onSubmit={onSubmitDepositForm}
                  onChangeWallet={onChangeWallet}
                />
              );
            default: {
              const steps =
                [LoginStep.VALIDATE_DATA, LoginStep.RECOVER_ACCOUNT_PROOF].indexOf(currentStep) >= 0
                  ? recoveringProgresses
                  : isNewAccount
                  ? signupProgresses
                  : loginProgresses;
              return (
                <Progress
                  currentStep={currentStep}
                  worldState={worldState}
                  steps={steps}
                  active={!message || messageType === MessageType.TEXT}
                  failed={!!message && messageType === MessageType.ERROR}
                />
              );
            }
          }
        })()}
      </LoginTemplate>
    </Root>
  );
};

import React from 'react';
import styled from 'styled-components/macro';
import {
  LoginMode,
  LoginState,
  LoginStep,
  MessageType,
  ProviderState,
  ShieldFormValues,
  SystemMessage,
  Wallet,
  WalletId,
  WorldState,
} from '../../app';
import { Text, TextLink } from '../../components';
import { spacings } from '../../styles';
import { AliasForm } from './alias_form';
import { ConnectForm } from './connect_form';
import { ShieldForAliasForm } from './shield_for_alias_form';
import { InitDataForm } from './init_data_form';
import { LoginTemplate } from './login_template';

const PaddedTop = styled.div`
  padding-top: ${spacings.m};
`;

const loginProgresses = [
  {
    step: LoginStep.INIT_ACCOUNT,
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
    step: LoginStep.INIT_ACCOUNT,
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

interface LoginProps {
  worldState: WorldState;
  loginState: LoginState;
  providerState?: ProviderState;
  shieldForAliasForm?: ShieldFormValues;
  availableWallets: Wallet[];
  explorerUrl: string;
  systemMessage: SystemMessage;
  setAlias: (alias: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  onSelectWallet: (walletId: WalletId) => void;
  onRestart?: () => void;
  onForgotAlias: () => void;
  onSelectAlias: (alias: string) => void;
  onShieldForAliasFormInputsChange(inputs: Partial<ShieldFormValues>): void;
  onSubmitShieldForAliasForm(isRetry?: boolean): void;
  onChangeWallet(walletId: WalletId): void;
}

interface StepInfo {
  stepNo: number;
  title: React.ReactNode;
  description: React.ReactNode;
  footnote?: React.ReactNode;
}

const getStepInfo = ({ loginState: { step, mode, allowToProceed }, explorerUrl }: LoginProps): StepInfo => {
  if (!allowToProceed) {
    return {
      stepNo: 2,
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
    };
  }

  switch (step) {
    case LoginStep.CONNECT_WALLET:
      return {
        stepNo: 1,
        title: (
          <>
            <Text text={mode === LoginMode.SIGNUP ? 'Sign up' : 'Log in'} weight="bold" inline />
            {' with your wallet'}
          </>
        ),
        description: (
          <>
            {
              'Your wallet is used to derive private keys, which are used to encrypt your data and sign private transactions.'
            }
            {mode === LoginMode.SIGNUP && <PaddedTop>{'More coming soon!'}</PaddedTop>}
          </>
        ),
      };
    case LoginStep.SET_ALIAS: {
      if (mode === LoginMode.LOGIN) {
        return {
          stepNo: 2,
          title: (
            <>
              {'Enter your '}
              <Text text="alias" weight="bold" inline />
            </>
          ),
          description: `Please enter the alias you used to register your zk.money account.`,
        };
      }
      return {
        stepNo: 2,
        title:
          mode === LoginMode.SIGNUP ? (
            <>
              {'Pick an '}
              <Text text="alias" weight="bold" inline />
            </>
          ) : (
            <>
              {'Pick an '}
              <Text text="new" weight="bold" inline />
              {' alias'}
            </>
          ),
        description: `Your alias makes it simple for your friends to send you crypto. It lets them look up your end-to-end encryption keys, so the rest of the world can’t snoop on your data 👀`,
      };
    }
    case LoginStep.RECOVER_ACCOUNT_PROOF:
      return {
        stepNo: 4,
        title: (
          <>
            {'Restoring '}
            <Text text="your" weight="bold" inline />
            {' account...'}
          </>
        ),
        description: `Looks like you have tried to register before. We are restoring your account to see if you can still claim your desired alias.`,
      };
    case LoginStep.CLAIM_USERNAME:
      return {
        stepNo: 4,
        title: 'Account Registration',
        description: `To create a new Aztec account, shield at least 0.01 ETH.`,
      };
    default:
      return {
        stepNo: 3,
        title:
          mode === LoginMode.LOGIN ? (
            <>
              {'Logging '}
              <Text text="you" weight="bold" inline />
              {' in...'}
            </>
          ) : (
            <>
              {'Creating '}
              <Text text="your" weight="bold" inline />
              {' account...'}
            </>
          ),
        description: `This may take several minutes, please don’t close the window.`,
      };
  }
};

export const Login: React.FunctionComponent<LoginProps> = props => {
  const {
    worldState,
    loginState,
    providerState,
    shieldForAliasForm,
    availableWallets,
    systemMessage,
    setAlias,
    setRememberMe,
    onSelectWallet,
    onRestart,
    onForgotAlias,
    onSelectAlias,
    onShieldForAliasFormInputsChange,
    onSubmitShieldForAliasForm,
    onChangeWallet,
  } = props;
  const { step, mode, walletId, alias, aliasAvailability, rememberMe, allowToProceed } = loginState;
  const { stepNo, title, description, footnote } = getStepInfo(props);
  const { message, type: messageType } = systemMessage;

  return (
    <LoginTemplate
      totalSteps={3}
      currentStep={stepNo}
      title={title}
      description={description}
      footnote={footnote}
      onRestart={onRestart}
    >
      {(() => {
        switch (step) {
          case LoginStep.CONNECT_WALLET:
            return (
              <ConnectForm
                mode={mode}
                walletId={walletId}
                availableWallets={availableWallets}
                onSelectWallet={onSelectWallet}
                moreComingSoon={mode === LoginMode.SIGNUP && availableWallets.length < 3}
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
                onForgotAlias={onForgotAlias}
                isNewAccount={mode === LoginMode.SIGNUP}
                isNewAlias={[LoginMode.SIGNUP, LoginMode.NEW_ALIAS].includes(mode)}
              />
            );
          case LoginStep.CLAIM_USERNAME:
            return (
              <ShieldForAliasForm
                providerState={providerState}
                form={shieldForAliasForm!}
                onChangeInputs={onShieldForAliasFormInputsChange}
                onSubmit={onSubmitShieldForAliasForm}
                onChangeWallet={onChangeWallet}
              />
            );
          default: {
            const steps =
              [LoginStep.VALIDATE_DATA, LoginStep.RECOVER_ACCOUNT_PROOF].indexOf(step) >= 0
                ? recoveringProgresses
                : mode === LoginMode.LOGIN
                ? loginProgresses
                : signupProgresses;
            return (
              <InitDataForm
                currentStep={step}
                worldState={worldState}
                steps={steps}
                active={!message || messageType !== MessageType.ERROR}
                failed={!!message && messageType === MessageType.ERROR}
              />
            );
          }
        }
      })()}
    </LoginTemplate>
  );
};

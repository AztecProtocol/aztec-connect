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
  wallets,
  WorldState,
} from '../../app';
import { Text, TextLink, WalletPicker } from '../../components';
import { breakpoints, spacings } from '../../styles';
import { AliasForm } from './alias_form';
import { ConnectForm } from './connect_form';
import { ShieldForAliasForm } from './shield_for_alias_form';
import { InitDataForm } from './init_data_form';
import { LoginTemplate } from './login_template';
import { MigrateAccountForm } from './migrate_account_form';
import { MigrateBalance } from './migrate_balance';
import { Progress } from './progress';
import { SeedPhraseForm } from './seed_phrase_form';

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

const migratingProgresses = [
  {
    step: LoginStep.MIGRATE_ACCOUNT,
    title: 'Creating Proof',
  },
  {
    step: LoginStep.SYNC_ACCOUNT,
    title: 'Checking Account Balances',
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
  setSeedPhrase: (seedPhrase: string) => void;
  setAlias: (alias: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  onSelectWallet: (walletId: WalletId) => void;
  onRestart?: () => void;
  onForgotAlias: () => void;
  onSelectSeedPhrase: (seedPhrase: string) => void;
  onMigrateToWallet(walletId: WalletId): void;
  onMigrateAccount(): void;
  onMigrateNotes(): void;
  onClearAccountV0s(): void;
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

const getStepInfo = ({
  loginState: { step, mode, seedPhrase, allowToProceed, migratingAssets, accountV0 },
  explorerUrl,
  onClearAccountV0s,
}: LoginProps): StepInfo => {
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
        title:
          mode === LoginMode.MIGRATE ? (
            <>
              <Text text="Migrate" weight="bold" inline />
              {' your account'}
            </>
          ) : (
            <>
              <Text text={mode === LoginMode.SIGNUP ? 'Sign up' : 'Log in'} weight="bold" inline />
              {' with your wallet'}
            </>
          ),
        description:
          mode === LoginMode.MIGRATE ? (
            'Please connect the wallet you used to register and sign a message to check if you have a migratable account from the old system.'
          ) : (
            <>
              {
                'Your wallet is used to derive private keys, which are used to encrypt your data and sign private transactions.'
              }
              {mode === LoginMode.SIGNUP && <PaddedTop>{'More coming soon!'}</PaddedTop>}
            </>
          ),
      };
    case LoginStep.SET_SEED_PHRASE:
      return {
        stepNo: 1,
        title: (
          <>
            {'Enter your '}
            <Text text="seed phrase" weight="bold" inline />
          </>
        ),
        description: `Please enter the seed phrase you used to register your zk.money account.`,
      };
    case LoginStep.SET_ALIAS: {
      if ([LoginMode.LOGIN, LoginMode.MIGRATE].includes(mode)) {
        return {
          stepNo: 2,
          title: (
            <>
              {'Enter your '}
              <Text text="username" weight="bold" inline />
            </>
          ),
          description: `Please enter the username you used to register your zk.money account.`,
        };
      }
      return {
        stepNo: 2,
        title:
          mode === LoginMode.SIGNUP ? (
            <>
              {'Pick a '}
              <Text text="username" weight="bold" inline />
            </>
          ) : (
            <>
              {'Pick a '}
              <Text text="new" weight="bold" inline />
              {' username'}
            </>
          ),
        description: `Your username makes it simple for your friends to send you crypto. It lets them look up your end-to-end encryption keys, so the rest of the world can’t snoop on your data 👀`,
      };
    }
    case LoginStep.CONFIRM_MIGRATION:
      return {
        stepNo: 2,
        title: 'Migrate your account',
        description: `zk.money has been upgraded to a new key management system, where your private key won't be stored in the browser. Please migrate your account and balances to the new system to make your future transactions even more secure!`,
        footnote: accountV0 ? (
          <TextLink
            text="Don't show this message again."
            color="greyLight"
            size="xxs"
            hover="underline"
            onClick={onClearAccountV0s}
          />
        ) : (
          ''
        ),
      };
    case LoginStep.MIGRATE_WALLET:
      return {
        stepNo: 2,
        title: 'Migrate your account',
        description: (
          <>
            {seedPhrase
              ? 'Login with seed phrase is no longer supported. Please connect a wallet to migrate your account and balances to the new system.'
              : 'Please connect a wallet to start account migration.'}
            <PaddedTop>
              {
                'Your wallet is used to derive private keys, which are used to encrypt your data and sign private transactions.'
              }
            </PaddedTop>
          </>
        ),
      };
    case LoginStep.MIGRATE_ACCOUNT:
    case LoginStep.SYNC_ACCOUNT:
      return {
        stepNo: 3,
        title: !migratingAssets.length ? (
          <>
            {'Upgrading '}
            <Text text="your" weight="bold" inline />
            {' account...'}
          </>
        ) : (
          <>
            {'Migrate '}
            <Text text="your" weight="bold" inline />
            {' balances'}
          </>
        ),
        description: !migratingAssets.length
          ? 'This may take several minutes. Please don’t close the window.'
          : 'There are some balances left in your old account. Migrate them to the new account to spend them. The fees will be taken from the old balances.',
      };
    case LoginStep.MIGRATE_NOTES:
      return {
        stepNo: 3,
        title: (
          <>
            {'Migrating '}
            <Text text="your" weight="bold" inline />
            {' balances...'}
          </>
        ),
        description: 'This may take several minutes. Please don’t close the window.',
      };
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
        description: `Looks like you have tried to register before. We are restoring your account to see if you can still claim your desired username.`,
      };
    case LoginStep.CLAIM_USERNAME:
      return {
        stepNo: 4,
        title: 'Shield ETH', // TODO - Could be other assets.
        description: `In order to prevent spam, you must shield at the same time as claiming a username. Please shield at least 0.01 ETH.`,
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

const Root = styled.div`
  padding-bottom: ${spacings.xxl};

  @media (max-width: ${breakpoints.s}) {
    margin: 0 -${spacings.m};
    padding-bottom: 0;
  }
`;

export const Login: React.FunctionComponent<LoginProps> = props => {
  const {
    worldState,
    loginState,
    providerState,
    shieldForAliasForm,
    availableWallets,
    systemMessage,
    setSeedPhrase,
    setAlias,
    setRememberMe,
    onSelectWallet,
    onSelectSeedPhrase,
    onMigrateToWallet,
    onMigrateAccount,
    onMigrateNotes,
    onRestart,
    onForgotAlias,
    onSelectAlias,
    onShieldForAliasFormInputsChange,
    onSubmitShieldForAliasForm,
    onChangeWallet,
  } = props;
  const { step, mode, walletId, seedPhrase, alias, aliasAvailability, rememberMe, allowToProceed, migratingAssets } =
    loginState;
  const { stepNo, title, description, footnote } = getStepInfo(props);
  const { message, type: messageType } = systemMessage;

  return (
    <>
      <Root>
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
              case LoginStep.MIGRATE_WALLET: {
                const availableWallets = (
                  window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK)
                ).filter(w => w.id !== WalletId.HOT);
                return <WalletPicker wallets={availableWallets} walletId={walletId} onSubmit={onMigrateToWallet} />;
              }
              case LoginStep.CONFIRM_MIGRATION:
                return (
                  <MigrateAccountForm
                    alias={alias}
                    onMigrateAccount={onMigrateAccount}
                    hasError={!!message && messageType === MessageType.ERROR}
                  />
                );
              case LoginStep.MIGRATE_ACCOUNT:
              case LoginStep.SYNC_ACCOUNT:
                if (!migratingAssets.length) {
                  return (
                    <Progress
                      currentStep={step}
                      steps={migratingProgresses}
                      active={!message || messageType !== MessageType.ERROR}
                      failed={!!message && messageType === MessageType.ERROR}
                    />
                  );
                }
                return (
                  <MigrateBalance
                    migratingAssets={migratingAssets}
                    onMigrateNotes={migratingAssets.some(a => a.totalFee) ? onMigrateNotes : undefined}
                  />
                );
              case LoginStep.MIGRATE_NOTES: {
                const activeAsset =
                  migratingAssets.find(
                    a => a.migratableValues.length > 0 && a.migratedValues.length * 2 < a.migratableValues.length,
                  ) || migratingAssets[migratingAssets.length - 1];
                return <MigrateBalance migratingAssets={migratingAssets} activeAsset={activeAsset} />;
              }
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
      </Root>
    </>
  );
};

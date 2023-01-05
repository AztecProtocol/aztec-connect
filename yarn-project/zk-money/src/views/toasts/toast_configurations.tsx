// import { FetchSignerResult } from '@wagmi/core';
import Cookies from 'js-cookie';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ToastsObs } from '../../alt-model/top_level_context/toasts_obs.js';
import { RegisterFormFlowState } from '../../alt-model/forms/register/register_form_flow.js';
import { Button, ButtonTheme, TxProgress, TxProgressFlow, TxProgressStep } from '../../ui-components/index.js';
import { WalletInteractionStep, WalletInteractionToast } from '../../components/index.js';
import { FlowRunnerState } from '../../toolbox/flows/flow_runner.js';
import { PhaseType } from '../../views/account/dashboard/register_account_form.js';
import style from './toast_configurations.module.scss';

export enum Toasts {
  COOKIES = 'COOKIES',
  REGISTER = 'REGISTER',
  WALLET_SELECTOR = 'WALLET_SELECTOR',
  WALLET_INTERACTION = 'WALLET_INTERACTION',
}

const acceptCookies = () => {
  Cookies.set('accepted', 'true');
};

export const getCookiesToast = (toastsObs: ToastsObs) => ({
  key: Toasts.COOKIES,
  text: 'This website uses cookies to enhance to user experience. Learn more in our Privacy Policy.',
  heavy: true,
  primaryButton: {
    onClick: () => {
      acceptCookies();
      toastsObs.removeToastByKey(Toasts.COOKIES);
    },
    text: 'Accept',
  },
  secondaryButton: {
    onClick: () => {
      window.open('https://www.aztec.network/privacy', '_blank');
    },
    text: 'Learn More',
  },
});

export const getRegisterToast = (
  onRetry: () => Promise<void>,
  onCancel: () => void,
  onResetRunner: () => void,
  walletInteractionToastsObs: ToastsObs,
  runnerState: FlowRunnerState<RegisterFormFlowState>,
  item:
    | {
        step?: undefined;
        interactionStep: WalletInteractionStep;
      }
    | {
        step: TxProgressStep;
        interactionStep: WalletInteractionStep;
      },
) => ({
  closable: true,
  key: Toasts.REGISTER,
  onClose: () => {
    walletInteractionToastsObs.removeToastByKey(Toasts.REGISTER);
    onCancel();
    onResetRunner();
  },
  components: (
    <WalletInteractionToast
      onRetry={onRetry}
      onCancel={onCancel}
      runnerState={runnerState}
      interactionStep={item.interactionStep}
      submitDisabled={false}
      content={<TxProgress flow={TxProgressFlow.L1_DEPOSIT} activeStep={item.step} />}
    />
  ),
});

export const getWalletSelectorToast = (closeModal: () => void) => ({
  key: Toasts.WALLET_SELECTOR,
  closable: true,
  components: (
    <div className={style.signatureToast}>
      Do you wish to switch the wallet you're signing with?
      <div className={style.note}>
        Please note, this has no effect on the Aztec account you're currently signed in with.
      </div>
      <div className={style.interactions}>
        <ConnectButton accountStatus="address" showBalance={false} />
        <Button onClick={closeModal} text={'Close'} theme={ButtonTheme.Secondary} />
      </div>
    </div>
  ),
});

export const getWalletInteractionToast = (
  phase: PhaseType,
  disabled: boolean,
  handleRequestSignature: () => Promise<void>,
  onClose: () => void,
) => ({
  closable: true,
  key: Toasts.WALLET_INTERACTION,
  onClose,
  components: (
    <WalletInteractionToast
      submitDisabled={disabled}
      message={'Please select a wallet to perform the signature'}
      interactionStep={phase === 'awaiting-signature' ? WalletInteractionStep.WaitingForSignature : undefined}
      onRetry={handleRequestSignature}
      onSubmit={handleRequestSignature}
      onCancel={onClose}
    />
  ),
});

export const getAccountConfirmationToast = (
  phase: PhaseType,
  disabled: boolean,
  handleRequestSignature: () => Promise<void>,
  onClose: () => void,
) => ({
  closable: true,
  key: Toasts.WALLET_INTERACTION,
  onClose,
  components: (
    <WalletInteractionToast
      submitDisabled={disabled}
      message={'Please sign again to ensure your signature is stable'}
      interactionStep={phase === 'awaiting-signature' ? WalletInteractionStep.WaitingForSignature : undefined}
      onRetry={handleRequestSignature}
      onSubmit={handleRequestSignature}
      onCancel={onClose}
    />
  ),
});

import { useContext, useEffect } from 'react';
import { AmountSelection, WalletInteractionStep } from '../../../components/index.js';
import { Field, FieldStatus, TxProgressStep, FormWarning } from '../../../ui-components/index.js';
import { RegisterForm } from '../../../alt-model/forms/register/register_form_hooks.js';
import { RegisterFormFlowRunnerState } from '../../../alt-model/forms/register/register_form_flow_runner_hooks.js';
import { TopLevelContext } from '../../../alt-model/top_level_context/top_level_context.js';
import { TxGasSection } from '../../../views/account/dashboard/modals/sections/gas_section/index.js';
import { getRegisterToast } from '../../../views/toasts/toast_configurations.js';
import { useWalletInteractionIsOngoing } from '../../../alt-model/wallet_interaction_hooks.js';
import style from './register_account_form.module.scss';

export type KeyType = 'account' | 'spending';
export type PhaseType = 'idle' | 'signer-select' | 'awaiting-signature';

interface RegisterAccountFormProps {
  registerForm: RegisterForm;
  locked: boolean;
  runnerState: RegisterFormFlowRunnerState;
  onResetRunner: () => void;
  onRetry: () => Promise<void>;
  onCancel: () => void;
}

function getAliasFieldStatus(alias: string, aliasFeedback?: string) {
  const aliasHasFeedback = aliasFeedback && aliasFeedback.length > 0;

  if (aliasHasFeedback) {
    return FieldStatus.Error;
  }

  if (alias.length > 0) {
    return FieldStatus.Success;
  }
}

function getInteractionItem(runnerState: RegisterFormFlowRunnerState) {
  const { flowState } = runnerState;
  if (runnerState.error) {
    return {
      interactionStep: WalletInteractionStep.Error,
    };
  }

  switch (flowState?.phase) {
    case 'creating-proof':
      return {
        step: TxProgressStep.PROVING,
        interactionStep: WalletInteractionStep.CreatingProof,
      };
    case 'deposit-and-sign':
      return {
        step: TxProgressStep.SIGNING_L1_DEPOSIT,
        interactionStep: WalletInteractionStep.L1DepositAndSignInteractions,
      };
    case 'sending-proof':
      return {
        step: TxProgressStep.SIGNING_L1_DEPOSIT,
        interactionStep: WalletInteractionStep.SendingProof,
      };
    case 'done':
      return {
        step: TxProgressStep.DONE,
        interactionStep: WalletInteractionStep.Done,
      };
  }
}

export function RegisterAccountForm(props: RegisterAccountFormProps) {
  const { fields, setters, feedback, assessment, resources, locked } = props.registerForm;
  const { walletInteractionToastsObs } = useContext(TopLevelContext);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  useEffect(() => {
    const interactionItem = getInteractionItem(props.runnerState);
    if (interactionItem) {
      const toastItem = getRegisterToast(
        props.onRetry,
        props.onCancel,
        props.onResetRunner,
        walletInteractionToastsObs,
        props.runnerState,
        interactionItem,
      );

      walletInteractionToastsObs.addOrReplaceToast(toastItem);
      return () => walletInteractionToastsObs.removeToastByKey(toastItem.key);
    }
  }, [props.onRetry, props.onResetRunner, props.onCancel, walletInteractionToastsObs, props.runnerState]);

  return (
    <div className={style.registerAccountForm}>
      <Field
        label="Pick an alias"
        sublabel="Choose an alias in place of your account key so other users can find you more easily"
        value={fields.alias}
        onChangeValue={(value: string) => setters.alias(value.toLowerCase())}
        disabled={locked || walletInteractionIsOngoing}
        placeholder="@username"
        prefix="@"
        message={feedback.alias}
        status={getAliasFieldStatus(fields.alias, feedback.alias)}
      />
      <TxGasSection
        speed={fields.speed}
        onChangeSpeed={setters.speed}
        feeAmounts={resources.feeAmounts}
        disabled={locked}
        label={'Select a speed for your registration'}
        balanceType="L1"
        asset={resources.depositAsset}
        targetAssetIsErc20={fields.depositAssetId !== 0}
      />
      <AmountSelection
        label={'Make your first deposit (Optional)'}
        sublabel={'Take advantage of your registration transaction fee and make a feeless deposit'}
        maxAmount={assessment.balances?.info.maxL2Output ?? 0n}
        asset={resources.depositAsset}
        allowWalletSelection={true}
        amountStringOrMax={fields.depositValueStrOrMax}
        disabled={locked}
        allowAssetSelection={false}
        onChangeAsset={setters.depositAssetId}
        onChangeAmountStringOrMax={setters.depositValueStrOrMax}
        balanceType={'L1'}
      />
      {feedback.amount && <FormWarning text={feedback.amount} />}
      {feedback.walletAccount && <FormWarning text={feedback.walletAccount} />}
      {feedback.footer && <FormWarning text={feedback.footer} />}
    </div>
  );
}

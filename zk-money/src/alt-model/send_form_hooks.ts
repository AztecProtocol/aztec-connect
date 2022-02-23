import { AccountId, AztecSdk } from '@aztec/sdk';
import { useEffect, useMemo, useRef } from 'react';
import { assets, Provider, RollupService, SendForm, SendFormValues, SendMode } from '../app';
import { useSpendableBalance } from './balance_hooks';
import { useApp } from './app_context';
import { AccountUtils } from '../app/account_utils';
import { KeyVault } from '../app/key_vault';
import { Config } from '../config';
import { useFormIsProcessing, useFormValues, useSyncProviderIntoForm } from './account_form_hooks';

interface AttemptCreateSendFormDeps {
  accountUtils?: AccountUtils;
  sdk?: AztecSdk;
  provider?: Provider;
  assetId: number;
  alias?: string;
  accountId?: AccountId;
  spendableBalance: bigint;
  keyVault?: KeyVault;
  rollupService?: RollupService;
  sendMode?: SendMode;
  config: Config;
}

function attemptCreateSendForm(deps: AttemptCreateSendFormDeps) {
  if (
    deps.sdk &&
    deps.keyVault &&
    deps.alias &&
    deps.accountId &&
    deps.rollupService &&
    deps.accountUtils &&
    deps.sendMode !== undefined
  ) {
    const accountState = { alias: deps.alias, userId: deps.accountId };
    const assetState = { asset: assets[deps.assetId], spendableBalance: deps.spendableBalance };
    const sendForm = new SendForm(
      accountState,
      assetState,
      deps.provider,
      deps.keyVault,
      deps.sdk,
      deps.rollupService,
      deps.accountUtils,
      deps.config.txAmountLimits[deps.assetId],
      deps.sendMode,
    );
    sendForm.init();
    return sendForm;
  }
}

export function useSendForm(assetId: number, sendMode: SendMode) {
  const app = useApp();
  const { sdk, requiredNetwork } = app;
  const spendableBalance = useSpendableBalance(assetId) ?? 0n;

  const accountUtils = useMemo(() => sdk && new AccountUtils(sdk, requiredNetwork), [sdk, requiredNetwork]);

  const sendFormRef = useRef<SendForm>();
  if (!sendFormRef.current) {
    sendFormRef.current = attemptCreateSendForm({
      ...app,
      accountUtils,
      assetId,
      spendableBalance,
      sendMode,
    });
  }
  const sendForm = sendFormRef.current;
  useEffect(() => () => sendForm?.destroy(), [sendForm]);

  useEffect(() => {
    sendForm?.changeAssetState({ asset: assets[assetId], spendableBalance });
  }, [sendForm, spendableBalance, assetId]);

  useSyncProviderIntoForm(sendForm);
  const formValues = useFormValues<SendFormValues>(sendForm);
  const processing = useFormIsProcessing(sendForm);

  return { formValues, sendForm, processing, spendableBalance };
}

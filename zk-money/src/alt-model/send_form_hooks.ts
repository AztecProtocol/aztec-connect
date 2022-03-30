import type { RemoteAsset } from './types';
import { AccountId, AztecSdk } from '@aztec/sdk';
import { useEffect, useMemo, useRef } from 'react';
import { Provider, RollupService, SendForm, SendFormValues, SendMode } from '../app';
import { useSpendableBalance } from './balance_hooks';
import { useApp } from './app_context';
import { AccountUtils } from '../app/account_utils';
import { KeyVault } from '../app/key_vault';
import { Config } from '../config';
import { useFormIsProcessing, useFormValues, useSyncProviderIntoForm } from './account_form_hooks';
import { useSdk } from './top_level_context';
import { isKnownAssetAddressString } from './known_assets/known_asset_addresses';

interface AttemptCreateSendFormDeps {
  accountUtils?: AccountUtils;
  sdk?: AztecSdk;
  provider?: Provider;
  asset: RemoteAsset;
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
    const assetState = { asset: deps.asset, spendableBalance: deps.spendableBalance };

    const assetAddressStr = deps.asset.address.toString();
    if (!isKnownAssetAddressString(assetAddressStr)) {
      throw new Error(`Attempting useSendForm with unknown asset address '${assetAddressStr}'`);
    }
    const sendForm = new SendForm(
      accountState,
      assetState,
      deps.provider,
      deps.keyVault,
      deps.sdk,
      deps.rollupService,
      deps.accountUtils,
      deps.config.txAmountLimits[assetAddressStr],
      deps.sendMode,
    );
    sendForm.init();
    return sendForm;
  }
}

export function useSendForm(asset: RemoteAsset, sendMode: SendMode) {
  const app = useApp();
  const { requiredNetwork } = app;
  const sdk = useSdk();
  const spendableBalance = useSpendableBalance(asset?.id) ?? 0n;

  const accountUtils = useMemo(() => sdk && new AccountUtils(sdk, requiredNetwork), [sdk, requiredNetwork]);

  const sendFormRef = useRef<SendForm>();
  if (!sendFormRef.current) {
    sendFormRef.current = attemptCreateSendForm({
      ...app,
      sdk,
      accountUtils,
      asset,
      spendableBalance,
      sendMode,
    });
  }
  const sendForm = sendFormRef.current;
  useEffect(() => () => sendForm?.destroy(), [sendForm]);

  useEffect(() => {
    sendForm?.changeAssetState({ asset, spendableBalance });
  }, [sendForm, spendableBalance, asset]);

  useSyncProviderIntoForm(sendForm);
  const formValues = useFormValues<SendFormValues>(sendForm);
  const processing = useFormIsProcessing(sendForm);

  return { formValues, sendForm, processing, spendableBalance };
}

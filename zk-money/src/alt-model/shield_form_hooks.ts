import { AccountId, EthereumProvider, AztecSdk, TxSettlementTime, AssetValue } from '@aztec/sdk';
import { useEffect, useMemo, useRef } from 'react';
import { EthAccount, Provider, RollupService, ShieldForm, ShieldFormValues, toBaseUnits } from '../app';
import { useSpendableBalance } from './balance_hooks';
import { useApp } from './app_context';
import { AccountUtils } from '../app/account_utils';
import { useRollupProviderStatus } from './rollup_provider_hooks';
import { Network } from '../app/networks';
import { KeyVault } from '../app/key_vault';
import { Database } from '../app/database';
import { Config } from '../config';
import { useFormIsProcessing, useFormValues, useSyncProviderIntoForm } from './account_form_hooks';
import { useInitialisedSdk } from './top_level_context';
import { RemoteAsset } from './types';
import { isKnownAssetAddressString } from './known_assets/known_asset_addresses';

interface AttemptCreateShieldFormDeps {
  ethAccount?: EthAccount;
  accountUtils?: AccountUtils;
  sdk?: AztecSdk;
  requiredNetwork: Network;
  provider?: Provider;
  asset: RemoteAsset;
  alias?: string;
  accountId?: AccountId;
  spendableBalance: bigint;
  keyVault?: KeyVault;
  db: Database;
  stableEthereumProvider?: EthereumProvider;
  rollupService?: RollupService;
  config: Config;
}

function attemptCreateShieldForm(deps: AttemptCreateShieldFormDeps) {
  if (
    deps.sdk &&
    deps.keyVault &&
    deps.alias &&
    deps.accountId &&
    deps.stableEthereumProvider &&
    deps.rollupService &&
    deps.ethAccount &&
    deps.accountUtils
  ) {
    const accountState = { alias: deps.alias, userId: deps.accountId };
    const assetState = { asset: deps.asset, spendableBalance: deps.spendableBalance };
    const assetAddressStr = deps.asset.address.toString();
    if (!isKnownAssetAddressString(assetAddressStr)) {
      throw new Error(`Attempting useSendForm with unknown asset address '${assetAddressStr}'`);
    }
    const shieldForm = new ShieldForm(
      accountState,
      assetState,
      undefined,
      deps.provider,
      deps.ethAccount,
      deps.keyVault,
      deps.sdk,
      deps.stableEthereumProvider,
      deps.rollupService,
      deps.accountUtils,
      deps.requiredNetwork,
      deps.config.txAmountLimits[assetAddressStr],
    );
    shieldForm.init();
    return shieldForm;
  }
}

function transformFeesField(fees: AssetValue[], rollupTime: number) {
  return {
    fees: {
      value: [
        { fee: fees[TxSettlementTime.NEXT_ROLLUP].value, time: rollupTime, speed: TxSettlementTime.NEXT_ROLLUP },
        { fee: fees[TxSettlementTime.INSTANT].value, time: 0, speed: TxSettlementTime.INSTANT },
      ],
    },
  };
}

export function useShieldForm(asset: RemoteAsset) {
  const app = useApp();
  const { requiredNetwork, provider } = app;
  const sdk = useInitialisedSdk();
  const spendableBalance = useSpendableBalance(asset.id) ?? 0n;

  const accountUtils = useMemo(() => sdk && new AccountUtils(sdk, requiredNetwork), [sdk, requiredNetwork]);

  const ethAccount = useMemo(
    () => accountUtils && new EthAccount(provider, accountUtils, asset.id, asset.address, requiredNetwork),
    [provider, accountUtils, asset, requiredNetwork],
  );

  const shieldFormRef = useRef<ShieldForm>();
  if (!shieldFormRef.current) {
    shieldFormRef.current = attemptCreateShieldForm({
      ...app,
      sdk,
      ethAccount,
      accountUtils,
      asset,
      spendableBalance,
    });
  }
  const shieldForm = shieldFormRef.current;
  useEffect(() => () => shieldForm?.destroy(), [shieldForm]);

  useEffect(() => {
    if (shieldForm && ethAccount) {
      shieldForm.changeEthAccount(ethAccount);
    }
  }, [shieldForm, ethAccount]);

  useEffect(() => {
    shieldForm?.changeAssetState({ asset, spendableBalance });
  }, [shieldForm, spendableBalance, asset]);

  useSyncProviderIntoForm(shieldForm);
  const formValues = useFormValues<ShieldFormValues>(shieldForm);
  const processing = useFormIsProcessing(shieldForm);

  // Refresh fees
  const rpStatus = useRollupProviderStatus();
  const rollupTime = rpStatus?.runtimeConfig.publishInterval;
  const depositAmount = toBaseUnits(formValues?.amount.value ?? '', asset.decimals);
  const assetId = asset.id;
  useEffect(() => {
    if (sdk && shieldForm && shieldForm.isNewAccount && rollupTime !== undefined) {
      sdk.getRegisterFees({ assetId, value: depositAmount }).then(fees => {
        shieldForm.changeValues(transformFeesField(fees, rollupTime));
      });
    }
  }, [sdk, shieldForm, assetId, depositAmount, rollupTime]);
  useEffect(() => {
    if (sdk && shieldForm && !shieldForm.isNewAccount && rollupTime !== undefined) {
      sdk.getDepositFees(asset.id).then(fees => {
        shieldForm.changeValues(transformFeesField(fees, rollupTime));
      });
    }
  }, [sdk, shieldForm, asset, rollupTime]);

  return { formValues, shieldForm, processing };
}

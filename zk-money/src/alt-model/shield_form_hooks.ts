import { AccountId, EthereumProvider, AztecSdk, TxSettlementTime } from '@aztec/sdk';
import { useEffect, useMemo, useRef } from 'react';
import { assets, EthAccount, Provider, RollupService, ShieldForm, ShieldFormValues, toBaseUnits } from '../app';
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

interface AttemptCreateShieldFormDeps {
  ethAccount?: EthAccount;
  accountUtils?: AccountUtils;
  sdk?: AztecSdk;
  requiredNetwork: Network;
  provider?: Provider;
  assetId: number;
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
    const assetState = { asset: assets[deps.assetId], spendableBalance: deps.spendableBalance };
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
      deps.config.txAmountLimits[deps.assetId],
    );
    shieldForm.init();
    return shieldForm;
  }
}

export function useShieldForm(assetId: number) {
  const app = useApp();
  const { requiredNetwork, provider } = app;
  const sdk = useInitialisedSdk();
  const spendableBalance = useSpendableBalance(assetId) ?? 0n;
  const rollupProviderStatus = useRollupProviderStatus();

  const accountUtils = useMemo(() => sdk && new AccountUtils(sdk, requiredNetwork), [sdk, requiredNetwork]);

  const assetAddress = rollupProviderStatus?.blockchainStatus.assets[assetId]?.address;
  const ethAccount = useMemo(
    () =>
      accountUtils && assetAddress && new EthAccount(provider, accountUtils, assetId, assetAddress, requiredNetwork),
    [provider, accountUtils, assetId, assetAddress, requiredNetwork],
  );

  const shieldFormRef = useRef<ShieldForm>();
  if (!shieldFormRef.current) {
    shieldFormRef.current = attemptCreateShieldForm({
      ...app,
      sdk,
      ethAccount,
      accountUtils,
      assetId,
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
    shieldForm?.changeAssetState({ asset: assets[assetId], spendableBalance });
  }, [shieldForm, spendableBalance, assetId]);

  useSyncProviderIntoForm(shieldForm);
  const formValues = useFormValues<ShieldFormValues>(shieldForm);
  const processing = useFormIsProcessing(shieldForm);

  // Refresh fees
  const rpStatus = useRollupProviderStatus();
  const rollupTime = rpStatus?.runtimeConfig.publishInterval;
  const depositAmount = toBaseUnits(formValues?.amount.value ?? '', assets[assetId].decimals);
  useEffect(() => {
    if (sdk && shieldForm && shieldForm.isNewAccount && rollupTime !== undefined) {
      sdk.getRegisterFees(assetId, depositAmount).then(fees => {
        shieldForm.changeValues({
          fees: {
            value: [
              { fee: fees[TxSettlementTime.NEXT_ROLLUP].value, time: rollupTime, speed: TxSettlementTime.NEXT_ROLLUP },
              { fee: fees[TxSettlementTime.INSTANT].value, time: 0, speed: TxSettlementTime.INSTANT },
            ],
          },
        });
      });
    }
  }, [sdk, shieldForm, assetId, depositAmount, rollupTime]);
  useEffect(() => {
    if (sdk && shieldForm && !shieldForm.isNewAccount && rollupTime !== undefined) {
      sdk.getDepositFees(assetId).then(fees => {
        shieldForm.changeValues({
          fees: {
            value: [
              { fee: fees[TxSettlementTime.NEXT_ROLLUP].value, time: rollupTime, speed: TxSettlementTime.NEXT_ROLLUP },
              { fee: fees[TxSettlementTime.INSTANT].value, time: 0, speed: TxSettlementTime.INSTANT },
            ],
          },
        });
      });
    }
  }, [sdk, shieldForm, assetId, rollupTime]);

  return { formValues, shieldForm, processing };
}

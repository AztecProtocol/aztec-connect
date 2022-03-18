import type { RemoteAsset } from 'alt-model/types';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from 'alt-model';
import { useInitialisedSdk } from 'alt-model/top_level_context';
import { EthAccount, EthAccountEvent } from 'app';
import { AccountUtils } from 'app/account_utils';

export function useLegacyEthAccountState(asset?: RemoteAsset) {
  const sdk = useInitialisedSdk();
  const { provider, requiredNetwork } = useApp();
  const ethAccount = useMemo(() => {
    if (provider && sdk && asset)
      return new EthAccount(provider, new AccountUtils(sdk, requiredNetwork), asset.id, asset.address, requiredNetwork);
  }, [provider, sdk, requiredNetwork, asset]);
  const [state, setState] = useState(ethAccount?.state);
  useEffect(() => {
    if (ethAccount) {
      const updateState = () => setState(ethAccount.state);
      ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, updateState);
      ethAccount.on(EthAccountEvent.UPDATED_PUBLIC_BALANCE, updateState);
      return () => {
        ethAccount.off(EthAccountEvent.UPDATED_PENDING_BALANCE, updateState);
        ethAccount.off(EthAccountEvent.UPDATED_PUBLIC_BALANCE, updateState);
      };
    }
  }, [ethAccount]);
  return state;
}

export function useL1Balances(asset?: RemoteAsset) {
  const state = useLegacyEthAccountState(asset);
  return {
    l1Balance: state?.publicBalance,
    l1PendingBalance: state?.pendingBalance,
  };
}

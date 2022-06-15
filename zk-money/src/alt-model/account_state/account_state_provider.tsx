import { GrumpkinAddress } from '@aztec/sdk';
import { useSdk } from 'alt-model/top_level_context';
import { useMemo, useEffect } from 'react';
import { AccountStateContext } from './account_state_context';
import { createAccountStateObs } from './account_state_obs';

interface AccountStateProviderProps {
  userId?: GrumpkinAddress;
  children: React.ReactNode;
}

export function AccountStateProvider({ userId, children }: AccountStateProviderProps) {
  const sdk = useSdk();
  const memoed = useMemo(() => {
    if (sdk && userId) return createAccountStateObs(sdk, userId);
  }, [sdk, userId]);
  useEffect(() => () => memoed?.unlistenAccountState(), [memoed]);
  return <AccountStateContext.Provider value={memoed?.accountStateObs}>{children}</AccountStateContext.Provider>;
}

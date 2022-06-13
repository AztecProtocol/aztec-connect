import { useMaybeObs } from 'app/util';
import { useContext } from 'react';
import { AccountStateContext } from './account_state_context';

export function useAccountState() {
  const obs = useContext(AccountStateContext);
  return useMaybeObs(obs);
}

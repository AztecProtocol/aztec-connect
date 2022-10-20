import { useMaybeObs } from '../../app/util/index.js';
import { useContext } from 'react';
import { AccountStateContext } from './account_state_context.js';

export function useAccountState() {
  const obs = useContext(AccountStateContext);
  return useMaybeObs(obs);
}

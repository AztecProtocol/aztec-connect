import { useContext } from 'react';
import { useObs } from '../../app/util/index.js';
import { TopLevelContext } from '../top_level_context/top_level_context.js';

export function useAccountState() {
  const obs = useContext(TopLevelContext).accountStateManager.stateObs;
  return useObs(obs);
}

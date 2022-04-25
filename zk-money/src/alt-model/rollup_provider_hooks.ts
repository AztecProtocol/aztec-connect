import { useObs } from 'app/util';
import { useContext } from 'react';
import { TopLevelContext } from './top_level_context/top_level_context';

export function useRollupProviderStatusPoller() {
  return useContext(TopLevelContext).remoteStatusPoller;
}

export function useRollupProviderStatus() {
  return useObs(useRollupProviderStatusPoller().obs);
}

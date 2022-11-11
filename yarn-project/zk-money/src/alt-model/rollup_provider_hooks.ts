import { useContext } from 'react';
import { useObs } from '../app/util/index.js';
import { TopLevelContext } from './top_level_context/top_level_context.js';

export function useRollupProviderStatusPoller() {
  return useContext(TopLevelContext).remoteStatusPoller;
}

export function useRollupProviderStatus() {
  return useObs(useRollupProviderStatusPoller().obs);
}

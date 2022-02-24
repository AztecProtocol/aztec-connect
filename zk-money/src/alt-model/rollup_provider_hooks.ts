import { useObs } from 'app/util';
import { useContext } from 'react';
import { TopLevelContext } from './top_level_context/top_level_context';

export function useRollupProviderStatus() {
  const { remoteStatusObs } = useContext(TopLevelContext);
  return useObs(remoteStatusObs);
}

import { useContext } from 'react';
import { TopLevelContext } from './top_level_context';

function useTopLevelContext() {
  return useContext(TopLevelContext);
}

export function useBridgeDataAdaptorsMethodCaches() {
  return useTopLevelContext().bridgeDataAdaptorsMethodCaches;
}

import { GrumpkinAddress } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { listenAccountUpdated } from './event_utils';
import { useSdk } from './top_level_context';

export function useUserIsSyncing(userId: GrumpkinAddress) {
  const sdk = useSdk();
  const [isSyncing, setIsSyncing] = useState<boolean>();
  useEffect(() => {
    if (sdk) {
      const updateIsSyncing = () => sdk?.isUserSynching(userId).then(setIsSyncing);
      updateIsSyncing();
      return listenAccountUpdated(sdk, userId, updateIsSyncing);
    }
  }, [sdk, userId]);
  return isSyncing;
}

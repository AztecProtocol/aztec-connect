import { SdkEvent } from '@aztec/sdk';
import { useObs } from 'app/util';
import { useContext, useEffect, useState } from 'react';
import { TopLevelContext } from './top_level_context';

function useSdk() {
  const { sdkObs } = useContext(TopLevelContext);
  return useObs(sdkObs);
}

function useSdkState() {
  const sdk = useSdk();
  const [destroyed, setDestroyed] = useState(false);
  useEffect(() => {
    if (sdk) {
      const updateStatus = async () => {
        setDestroyed(true);
      };
      updateStatus();
      sdk.addListener(SdkEvent.DESTROYED, updateStatus);
      return () => {
        sdk.removeListener(SdkEvent.DESTROYED, updateStatus);
      };
    }
  }, [sdk]);
  return destroyed;
}

export function useInitialisedSdk() {
  const sdk = useSdk();
  const destroyed = useSdkState();
  return !destroyed ? sdk : undefined;
}

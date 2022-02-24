import { SdkEvent, SdkInitState } from '@aztec/sdk';
import { useObs } from 'app/util';
import { useContext, useEffect, useState } from 'react';
import { TopLevelContext } from './top_level_context';

function useSdk() {
  const { sdkObs } = useContext(TopLevelContext);
  return useObs(sdkObs);
}

function useSdkLocalStatus() {
  const sdk = useSdk();
  const [localStatus, setLocalStatus] = useState(sdk?.getLocalStatus());
  useEffect(() => {
    if (sdk) {
      const updateStatus = () => {
        setLocalStatus(sdk.getLocalStatus());
      };
      updateStatus();
      sdk.addListener(SdkEvent.UPDATED_INIT_STATE, updateStatus);
      sdk.addListener(SdkEvent.UPDATED_WORLD_STATE, updateStatus);
      return () => {
        sdk.removeListener(SdkEvent.UPDATED_INIT_STATE, updateStatus);
        sdk.removeListener(SdkEvent.UPDATED_WORLD_STATE, updateStatus);
      };
    }
  }, [sdk]);
  return localStatus;
}

export function useInitialisedSdk() {
  const sdk = useSdk();
  const localStatus = useSdkLocalStatus();
  if (localStatus?.initState !== SdkInitState.INITIALIZED) return;
  return sdk;
}

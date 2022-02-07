import { RollupProviderStatus } from '@aztec/sdk';
import { useEffect, useState } from 'react';
import { useApp } from './app_context';

export function useRollupProviderStatus() {
  const { sdk } = useApp();
  const [status, setStatus] = useState<RollupProviderStatus>();
  useEffect(() => {
    if (sdk) {
      const updateStatus = () => sdk.getRemoteStatus().then(setStatus);
      updateStatus();
      // This hooks refetches as often as the legacy RollupService class.
      // TODO: This value should be lifted and shared to reduce refetches.
      const task = setInterval(updateStatus, 60 * 1000);
      return () => clearInterval(task);
    }
  }, [sdk]);
  return status;
}

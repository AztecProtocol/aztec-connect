import { useEffect, useState } from 'react';
import { ProviderEvent } from '../app/index.js';
import { useApp } from './app_context.js';

export function useProviderState() {
  const { provider } = useApp();
  const [state, setState] = useState(() => provider?.getState());
  useEffect(() => {
    if (provider) {
      setState(provider.getState());
      provider.on(ProviderEvent.UPDATED_PROVIDER_STATE, setState);
      return () => {
        provider.off(ProviderEvent.UPDATED_PROVIDER_STATE, setState);
      };
    }
  }, [provider]);
  return state;
}

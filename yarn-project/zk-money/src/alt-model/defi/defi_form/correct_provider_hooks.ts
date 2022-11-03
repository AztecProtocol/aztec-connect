import type { Provider } from '../../../app/index.js';
import { useEffect, useRef } from 'react';
import { useApp } from '../../../alt-model/app_context.js';
import { useProviderState } from '../../../alt-model/provider_hooks.js';
import { Semaphore } from '../../../app/util/index.js';

export function useAwaitCorrectProvider() {
  const { keyVault, provider } = useApp();
  const providerState = useProviderState();
  const address = providerState?.account;
  const ref = useRef<Semaphore<Provider>>();
  if (!ref.current) ref.current = new Semaphore();
  useEffect(() => {
    if (keyVault && address?.equals(keyVault.signerAddress) && provider) {
      ref.current?.open(provider);
    } else {
      ref.current?.close();
    }
  }, [keyVault, address, provider]);
  return ref.current.wait;
}

import type { Provider } from 'app';
import { useEffect, useRef } from 'react';
import { useApp } from 'alt-model/app_context';
import { useProviderState } from 'alt-model/provider_hooks';
import { Semaphore } from 'app/util';

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

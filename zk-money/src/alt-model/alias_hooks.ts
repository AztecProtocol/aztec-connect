import type { AztecSdk } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from 'app';
import { useEffect, useState } from 'react';
import { useSdk } from './top_level_context';

async function checkAliasExists(sdk: AztecSdk, aliasInput: string) {
  const alias = formatAliasInput(aliasInput);
  if (!isValidAliasInput(aliasInput)) return false;
  const availableLocally = await sdk.isAliasAvailable(alias);
  if (!availableLocally) return true;
  const availableRemotely = await sdk.isRemoteAliasAvailable(alias);
  return !availableRemotely;
}

export function useAliasIsValidRecipient(aliasInput: string, debounceMs = 500) {
  const sdk = useSdk();
  const [availabilty, setAvailabilty] = useState<boolean>();
  useEffect(() => {
    if (sdk) {
      const task = setTimeout(() => {
        setAvailabilty(undefined);
        checkAliasExists(sdk, aliasInput).then(setAvailabilty);
      }, debounceMs);
      return () => clearTimeout(task);
    }
  }, [sdk, aliasInput, debounceMs]);
  return availabilty;
}

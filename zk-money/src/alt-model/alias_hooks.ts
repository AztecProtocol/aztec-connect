import type { AccountId, AztecSdk } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from 'app';
import { createGatedSetter } from 'app/util';
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

export function useAccountIdForAlias(aliasInput: string, debounceMs: number) {
  const sdk = useSdk();
  const [accountIdFetchState, setAccountIdFetchState] = useState<{ accountId?: AccountId; isLoading: boolean }>({
    isLoading: false,
  });
  const alias = formatAliasInput(aliasInput);
  useEffect(() => {
    if (!isValidAliasInput(alias)) {
      setAccountIdFetchState({ isLoading: false });
      return;
    }
    const gatedSetter = createGatedSetter(setAccountIdFetchState);
    gatedSetter.set({ isLoading: true });
    const task = setTimeout(() => {
      sdk?.getAccountId(alias).then(accountId => gatedSetter.set({ isLoading: false, accountId }));
    }, debounceMs);
    return () => {
      gatedSetter.close();
      clearTimeout(task);
    };
  }, [sdk, alias, debounceMs]);
  return accountIdFetchState;
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

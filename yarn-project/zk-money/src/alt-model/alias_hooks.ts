import type { GrumpkinAddress } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from '../app/index.js';
import { createGatedSetter } from '../app/util/index.js';
import { useEffect, useState } from 'react';
import { useApp } from './app_context.js';
import { useSdk } from './top_level_context/index.js';

export function useUserIdForAlias(aliasInput: string, debounceMs: number, allowOwnAlias?: boolean) {
  const { alias: userAlias, userId } = useApp();
  const sdk = useSdk();
  const [userIdFetchState, setUserIdFetchState] = useState<{
    userId?: GrumpkinAddress;
    isLoading: boolean;
  }>({
    isLoading: false,
  });
  const alias = formatAliasInput(aliasInput);
  useEffect(() => {
    if (!isValidAliasInput(alias)) {
      setUserIdFetchState({ isLoading: false });
      return;
    }
    if (userAlias === alias) {
      if (allowOwnAlias) {
        setUserIdFetchState({ isLoading: false, userId });
      } else {
        setUserIdFetchState({ isLoading: false, userId: undefined });
      }
      return;
    }
    const gatedSetter = createGatedSetter(setUserIdFetchState);
    gatedSetter.set({ isLoading: true });
    const task = setTimeout(() => {
      sdk?.getAccountPublicKey(alias).then(userId => gatedSetter.set({ isLoading: false, userId }));
    }, debounceMs);
    return () => {
      gatedSetter.close();
      clearTimeout(task);
    };
  }, [sdk, alias, userAlias, allowOwnAlias, userId, debounceMs]);
  return userIdFetchState;
}

import { useEffect, useState } from 'react';
import { GrumpkinAddress } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from '../app/index.js';
import { createGatedSetter, useObs } from '../app/util/index.js';
import { useAccountState } from './account_state/index.js';
import { useSdk, useAliasManager } from './top_level_context/index.js';

export function useUserIdForRecipientStr(recipientStr: string, debounceMs: number, allowOwnAlias?: boolean) {
  const accountState = useAccountState();
  const sdk = useSdk();
  const cachedAlias = useCachedAlias();
  const [userIdFetchState, setUserIdFetchState] = useState<{
    userId?: GrumpkinAddress;
    isLoading: boolean;
  }>({
    isLoading: false,
  });
  const isGrumpkinAddress = GrumpkinAddress.isAddress(recipientStr);
  const formattedRecipientStr = isGrumpkinAddress ? recipientStr : formatAliasInput(recipientStr);
  useEffect(() => {
    if (!isValidAliasInput(formattedRecipientStr) && !isGrumpkinAddress) {
      setUserIdFetchState({ isLoading: false });
      return;
    }
    const gatedSetter = createGatedSetter(setUserIdFetchState);
    gatedSetter.set({ isLoading: true });

    const task = setTimeout(() => {
      if (isGrumpkinAddress) {
        gatedSetter.set({ isLoading: false, userId: GrumpkinAddress.fromString(formattedRecipientStr) });
      } else if (allowOwnAlias && recipientStr === cachedAlias) {
        gatedSetter.set({ isLoading: false, userId: accountState?.userId });
      } else {
        sdk?.getAccountPublicKey(formattedRecipientStr).then(userId => {
          const isErrorState = accountState?.userId && userId?.equals(accountState?.userId) && !allowOwnAlias;
          gatedSetter.set({ isLoading: false, userId: isErrorState ? undefined : userId });
        });
      }
    }, debounceMs);
    return () => {
      gatedSetter.close();
      clearTimeout(task);
    };
  }, [
    sdk,
    isGrumpkinAddress,
    formattedRecipientStr,
    accountState?.userId,
    cachedAlias,
    allowOwnAlias,
    debounceMs,
    recipientStr,
  ]);
  return userIdFetchState;
}

export function useCachedAlias(): string | undefined {
  const accountState = useAccountState();
  const aliasManager = useAliasManager();
  const aliasByUserId = useObs(aliasManager.aliasByUserIdStringObs);
  if (!accountState) return;
  return aliasByUserId[accountState.userId.toString()];
}

import { AccountId, SdkEvent, AztecSdk } from '@aztec/sdk';

export function listenAccountUpdated(sdk: AztecSdk, accountId: AccountId, func: () => void) {
  const handleUpdatedUserState = (otherAccountId: AccountId) => {
    if (otherAccountId.equals(accountId)) func();
  };
  sdk.on(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  return () => {
    sdk.off(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  };
}

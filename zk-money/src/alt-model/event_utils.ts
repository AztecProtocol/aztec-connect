import { AccountId, SdkEvent, AztecSdk } from '@aztec/sdk';

export function listenAccountUpdated(
  sdk: AztecSdk,
  accountId: AccountId,
  func: () => void,
  opts?: { includeNonce0?: boolean },
) {
  const nonce0Id = new AccountId(accountId.publicKey, 0);
  const handleUpdatedUserState = (otherAccountId: AccountId) => {
    if (
      otherAccountId.publicKey.equals(accountId.publicKey) ||
      (opts?.includeNonce0 && otherAccountId.equals(nonce0Id))
    ) {
      func();
    }
  };
  sdk.on(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  return () => {
    sdk.off(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  };
}

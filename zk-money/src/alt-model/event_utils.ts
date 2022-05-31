import { SdkEvent, AztecSdk, GrumpkinAddress } from '@aztec/sdk';

export function listenAccountUpdated(sdk: AztecSdk, userId: GrumpkinAddress, func: () => void) {
  const handleUpdatedUserState = (address: GrumpkinAddress) => {
    if (address.equals(userId)) func();
  };
  sdk.on(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  return () => {
    sdk.off(SdkEvent.UPDATED_USER_STATE, handleUpdatedUserState);
  };
}

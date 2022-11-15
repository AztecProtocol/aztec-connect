import { EthAddress, GrumpkinAddress } from '@aztec/sdk';

const SESSION_STORAGE_KEY = 'SESSION_STORAGE_KEY';

export class SessionPersist {
  constructor(public userId: GrumpkinAddress, public deriverEthAddress: EthAddress) {}

  static save(userId: GrumpkinAddress, deriverEthAddress: EthAddress) {
    const sessionDataStr = JSON.stringify({
      userId: userId.toString(),
      deriverEthAddress: deriverEthAddress.toString(),
    });
    localStorage.setItem(SESSION_STORAGE_KEY, sessionDataStr);
  }

  static load() {
    try {
      const sessionData = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!);
      return new SessionPersist(
        GrumpkinAddress.fromString(sessionData.userId),
        EthAddress.fromString(sessionData.deriverEthAddress),
      );
    } catch {
      return;
    }
  }

  static clear() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

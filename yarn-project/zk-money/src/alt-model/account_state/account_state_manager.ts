import type { Signer } from '@ethersproject/abstract-signer';
import createDebug from 'debug';
import { AztecSdk, EthAddress, EthersAdapter, GrumpkinAddress } from '@aztec/sdk';
import { Obs } from '../../app/util/index.js';
import { listenAccountUpdated } from '../event_utils.js';
import { SdkObs } from '../top_level_context/sdk_obs.js';
import { AccountState } from './account_state_types.js';
import { SessionPersist } from './session_persist.js';

const debug = createDebug('zm:account_state_manager');

export class AccountStateManager {
  constructor(private readonly sdkObs: SdkObs) {}

  stateObs = Obs.input<AccountState | undefined>(undefined);

  private unlisten: undefined | (() => void);

  async attemptRecoverSession() {
    debug('awaiting sdk');
    const sdk = await this.sdkObs.whenDefined();
    const previousSession = SessionPersist.load();
    const userId = previousSession?.userId;
    const deriverEthAddress = previousSession?.deriverEthAddress;
    debug('Attempt restore session');
    if (!userId || !deriverEthAddress) return;
    const added = await sdk.userExists(userId);
    if (!added) {
      debug('Session exists but userId not added to sdk.');
      return;
    }
    this.watchUser(sdk, userId, deriverEthAddress);
  }

  async activateFromSigner(signer: Signer) {
    debug('Activating from signer');
    const sdk = await this.sdkObs.whenDefined();
    const addressStr = await signer.getAddress();
    const ethAddress = EthAddress.fromString(addressStr);
    const provider = new EthersAdapter(signer.provider!);
    const keyPair = await sdk.generateAccountKeyPair(ethAddress, provider);
    this.activateUser(keyPair.publicKey, keyPair.privateKey, ethAddress);
  }

  async activateUser(userId: GrumpkinAddress, accountPrivateKey: Buffer, generatorEthAddress: EthAddress) {
    const sdk = await this.sdkObs.whenDefined();
    const added = await sdk.userExists(userId);
    if (!added) {
      debug('Adding user');
      await sdk.addUser(accountPrivateKey);
    }
    await this.setActiveUser(sdk, userId, generatorEthAddress);
  }

  async setActiveUser(sdk: AztecSdk, userId: GrumpkinAddress, deriverEthAddress: EthAddress) {
    // Call clear in case we've failed to do so already. (Otherwise two user
    // subscriptions will fight over the state.)
    this.clearActiveUser();
    debug('Setting active user');
    const added = await sdk.userExists(userId);
    if (!added) {
      debug("Can't activate user that hasn't first been added");
      return;
    }
    SessionPersist.save(userId, deriverEthAddress);
    this.watchUser(sdk, userId, deriverEthAddress);
  }

  async clearActiveUser() {
    debug('Clearing active user');
    this.unlisten?.();
    this.unlisten = undefined;
    this.stateObs.next(undefined);
    SessionPersist.clear();
  }

  private watchUser(sdk: AztecSdk, userId: GrumpkinAddress, ethAddressUsedForAccountKey: EthAddress) {
    debug(`Watching user state for '${userId.toString()}'`);

    // Start the sdk running (required for some queries below). We're only
    // doing this now so as to avoid overfetching data. (Adding a new user
    // resets the global synchronisation state.) It's benign to kick this
    // method when the sdk is already running.
    sdk.run();

    let isRegistered = false;
    const updateState = async () => {
      // Fetch in parallel
      const txsProm = sdk.getUserTxs(userId);
      const balancesProm = sdk.getBalances(userId);
      const spendingKeyRequired = true;
      const spendableBalancesProm = sdk.getSpendableSums(userId, spendingKeyRequired);
      const isSyncingProm = sdk.isUserSynching(userId);
      const syncedToRollupProm = sdk.getUserSyncedToRollup(userId);

      let isRegisteredProm: Promise<boolean> | undefined;
      if (!isRegistered) {
        // No need to query this again once we have a positive. As long as zk.money only supports
        // registered users, we don't need to fear over fetching before registration, because the
        // first SdkEvent.UPDATED_USER_STATE will be due to the user's registration txs.
        isRegisteredProm = sdk.isAccountRegistered(userId, true);
      }
      isRegistered = isRegisteredProm ? await isRegisteredProm : isRegistered;
      this.stateObs.next({
        isRegistered,
        txs: await txsProm,
        balances: await balancesProm,
        spendableBalances: await spendableBalancesProm,
        isSyncing: await isSyncingProm,
        syncedToRollup: await syncedToRollupProm,
        userId,
        ethAddressUsedForAccountKey,
      });
    };
    updateState();
    this.unlisten = listenAccountUpdated(sdk, userId, updateState);
  }
}

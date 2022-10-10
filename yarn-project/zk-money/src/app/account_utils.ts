import { AztecSdk, GrumpkinAddress } from '@aztec/sdk';
import createDebug from 'debug';
import { formatAliasInput, isValidAliasInput } from './alias.js';

const debug = createDebug('zm:account_utils');

export class AccountUtils {
  constructor(private sdk: AztecSdk) {}

  async addUser(privateKey: Buffer, noSync?: boolean) {
    const userId = await this.sdk.derivePublicKey(privateKey);
    try {
      await this.sdk.addUser(privateKey, noSync);
      debug(`Added user ${userId}.`);
    } catch (e) {
      // Do nothing if user is already added to the sdk.
    }
  }

  async removeUser(userId: GrumpkinAddress) {
    try {
      await this.sdk.removeUser(userId);
      debug(`Removed user ${userId}.`);
    } catch (e) {
      debug(e);
      return false;
    }
    return true;
  }

  async isValidRecipient(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return false;
    }

    const alias = formatAliasInput(aliasInput);
    const includePending = false;
    return this.sdk.isAliasRegistered(alias, includePending);
  }

  async getAccountId(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);
    return this.sdk.getAccountPublicKey(alias);
  }
}

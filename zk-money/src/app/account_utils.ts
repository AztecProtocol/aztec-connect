import { AccountId, AssetId, EthAddress, GrumpkinAddress, WalletSdk } from '@aztec/sdk';
import createDebug from 'debug';
import { formatAliasInput, isValidAliasInput } from './alias';
import { GraphQLService } from './graphql_service';
import { Network } from './networks';

const debug = createDebug('zm:account_utils');

export class AccountUtils {
  constructor(private sdk: WalletSdk, private graphql: GraphQLService, private requiredNetwork: Network) {}

  async isAccountSettled(userId: AccountId) {
    const accountTxs = await this.sdk.getAccountTxs(userId);
    return accountTxs.length > 1 || !!accountTxs[0]?.settled;
  }

  async addUser(privateKey: Buffer, nonce: number, noSync = !nonce) {
    const publicKey = this.sdk.derivePublicKey(privateKey);
    const userId = new AccountId(publicKey, nonce);
    try {
      await this.sdk.addUser(privateKey, nonce, noSync);
      debug(`Added user ${userId}.`);
    } catch (e) {
      // Do nothing if user is already added to the sdk.
    }
  }

  async removeUser(userId: AccountId) {
    try {
      await this.sdk.removeUser(userId);
      debug(`Removed user ${userId}.`);
    } catch (e) {
      debug(e);
      return false;
    }
    return true;
  }

  async isAliasAvailable(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return !!alias && !(await this.graphql.getAliasPublicKey(alias));
  }

  async getAliasPublicKey(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return this.graphql.getAliasPublicKey(alias);
  }

  async getAliasNonce(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return this.graphql.getAliasNonce(alias);
  }

  async isValidRecipient(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return false;
    }

    const alias = formatAliasInput(aliasInput);
    try {
      const accountId = await this.sdk.getAccountId(alias);
      if (accountId.nonce > 0) {
        return true;
      }
    } catch (e) {
      // getAccountId will throw if alias is not registered.
    }

    const aliasHash = (this.sdk as any).core.computeAliasHash(alias).toString().replace(/^0x/i, '');
    const unsettled = await this.graphql.getUnsettledAccountTxs();
    return unsettled.some(tx => tx.aliasHash === aliasHash);
  }

  async getAccountId(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);

    // Get the latest nonce from unsettled account txs.
    // TODO - Find a way to get pending account's public key without having to compute its alias hash or send the alias to server.
    const aliasHash = (this.sdk as any).core.computeAliasHash(alias).toString().replace(/^0x/i, '');
    const unsettled = await this.graphql.getUnsettledAccountTxs();
    const account = unsettled.find(tx => tx.aliasHash === aliasHash);
    if (account) {
      const { accountPubKey, nonce } = account;
      const publicKey = GrumpkinAddress.fromString(accountPubKey);
      return new AccountId(publicKey, nonce);
    }

    await this.sdk.awaitSynchronised();

    try {
      const accountId = await this.sdk.getAccountId(alias);
      if (accountId.nonce > 0) {
        return accountId;
      }
    } catch (e) {
      // getAccountId will throw if alias is not registered.
    }
  }

  async getAccountNonce(publicKey: GrumpkinAddress) {
    // Falafel will override [alias+oldPubKey] with [alias+newPubKey] so the nonce for oldPubKey will always be 0.
    return this.graphql.getAccountNonce(publicKey);
  }

  async getPendingDeposit(assetId: AssetId, inputOwner: EthAddress) {
    const txs = await this.graphql.getUnsettledJoinSplitTxs();
    return (
      txs
        .filter(tx => tx.assetId === assetId && EthAddress.fromString(tx.inputOwner).equals(inputOwner))
        .reduce((sum, tx) => {
          return sum + BigInt(tx.publicInput);
        }, 0n) || 0n
    );
  }

  async getPendingBalance(assetId: AssetId, ethAddress: EthAddress) {
    const deposited = await this.sdk.getUserPendingDeposit(assetId, ethAddress);
    const pendingDeposit = await this.getPendingDeposit(assetId, ethAddress);
    return deposited - pendingDeposit;
  }

  async confirmPendingBalance(
    assetId: AssetId,
    ethAddress: EthAddress,
    expectedPendingBalance: bigint,
    pollInterval = (this.requiredNetwork.network === 'ganache' ? 1 : 10) * 1000,
    timeout = 30 * 60 * 1000,
  ) {
    const started = Date.now();
    while (true) {
      if (Date.now() - started > timeout) {
        throw new Error(`Timeout awaiting pending balance confirmation.`);
      }

      const pendingBalance = await this.getPendingBalance(assetId, ethAddress);
      if (pendingBalance >= expectedPendingBalance) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}

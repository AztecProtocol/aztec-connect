import { AccountId, AssetId, EthAddress, GrumpkinAddress, WalletSdk } from '@aztec/sdk';
import createDebug from 'debug';
import { formatAliasInput, isValidAliasInput } from './alias';
import { GraphQLService } from './graphql_service';
import { Network } from './networks';
import { Provider, ProviderStatus } from './provider';

const debug = createDebug('zm:account_utils');

export class AccountUtils {
  constructor(private sdk: WalletSdk, private graphql: GraphQLService, private requiredNetwork: Network) {}

  isActiveProvider(provider?: Provider) {
    const { status, account, network } = provider?.getState() || {};
    return !!account && network?.chainId === this.requiredNetwork.chainId && status === ProviderStatus.INITIALIZED;
  }

  isUserAdded(userId: AccountId) {
    try {
      this.sdk.getUserData(userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  async isAccountSettled(userId: AccountId) {
    const accountTxs = await this.sdk.getAccountTxs(userId);
    return accountTxs.length > 1 || !!accountTxs[0]?.settled;
  }

  async addUser(privateKey: Buffer, nonce: number, noSync = false) {
    // No need to sync data for user with nonce 0.
    // But it will start syncing if latest rollup id is greater than lastSynced.
    return this.sdk.addUser(privateKey, nonce, !nonce || noSync);
  }

  async safeAddUser(privateKey: Buffer, nonce: number, noSync = false) {
    const publicKey = this.sdk.derivePublicKey(privateKey);
    const userId = new AccountId(publicKey, nonce);
    if (!this.isUserAdded(userId)) {
      await this.addUser(privateKey, nonce, noSync);
    }

    const userData = this.sdk.getUserData(userId);
    return userData.id;
  }

  async safeRemoveUser(userId: AccountId) {
    try {
      await this.sdk.removeUser(userId);
      debug(`Removed user ${userId}.`);
    } catch (e) {
      debug(e);
      return false;
    }
    return true;
  }

  async getAccountId(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);
    try {
      const accountId = await this.sdk.getAccountId(alias);
      if (accountId.nonce > 0) {
        return accountId;
      }
    } catch (e) {
      // getAccountId will throw if alias is not registered.
    }

    return this.getPendingAccountId(alias);
  }

  // TODO - Find a way to get pending account's public key without having to compute its alias hash or send the alias to server.
  private async getPendingAccountId(alias: string) {
    const aliasHash = (this.sdk as any).core.computeAliasHash(alias).toString().replace(/^0x/i, '');
    const unsettled = await this.graphql.getUnsettledAccountTxs();
    const account = unsettled.find(tx => tx.aliasHash === aliasHash);
    if (!account) return;

    const { accountPubKey, nonce } = account;
    const publicKey = GrumpkinAddress.fromString(accountPubKey);
    return new AccountId(publicKey, nonce);
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

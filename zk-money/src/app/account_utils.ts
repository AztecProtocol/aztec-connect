import { AccountId, AssetId, EthAddress, GrumpkinAddress, WalletSdk } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from './alias';
import { GraphQLService } from './graphql_service';
import { Network } from './networks';
import { Provider, ProviderStatus } from './provider';

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
}

import { ProofId } from '@aztec/barretenberg/client_proofs';
import { AccountId, AssetId, EthAddress, GrumpkinAddress, WalletSdk } from '@aztec/sdk';
import createDebug from 'debug';
import { formatAliasInput, isValidAliasInput } from './alias';
import { Network } from './networks';

const debug = createDebug('zm:account_utils');

export class AccountUtils {
  constructor(private sdk: WalletSdk, private requiredNetwork: Network) {}

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

  async getAliasPublicKey(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return (await this.sdk.getRemoteAccountId(alias))?.publicKey;
  }

  async getAliasNonce(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return this.sdk.getRemoteLatestAliasNonce(alias);
  }

  async getAccountNonce(publicKey: GrumpkinAddress) {
    return this.sdk.getRemoteLatestAccountNonce(publicKey);
  }

  async isAliasAvailable(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    return this.sdk.isRemoteAliasAvailable(alias);
  }

  async isValidRecipient(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return false;
    }

    const alias = formatAliasInput(aliasInput);
    return !(await this.sdk.isAliasAvailable(alias)) || !(await this.sdk.isRemoteAliasAvailable(alias));
  }

  async getAccountId(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);
    return this.sdk.getRemoteAccountId(alias);
  }

  async getPendingBalance(assetId: AssetId, ethAddress: EthAddress) {
    const deposited = await this.sdk.getUserPendingDeposit(assetId, ethAddress);
    const txs = await this.sdk.getRemoteUnsettledPaymentTxs();
    const unsettledDeposit =
      txs
        .filter(
          tx =>
            tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
            tx.proofData.publicAssetId === assetId &&
            tx.proofData.publicOwner.equals(ethAddress),
        )
        .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), 0n) || 0n;
    return deposited - unsettledDeposit;
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

import { ProofId } from '@aztec/barretenberg/client_proofs';
import { AztecSdk, EthAddress, GrumpkinAddress } from '@aztec/sdk';
import createDebug from 'debug';
import { formatAliasInput, isValidAliasInput } from './alias';
import { Network } from './networks';

const debug = createDebug('zm:account_utils');

export class AccountUtils {
  constructor(private sdk: AztecSdk, private requiredNetwork: Network) {}

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

  async getAliasPublicKey(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    const publicKey = await this.sdk.getAccountPublicKey(alias);
    if (publicKey) return publicKey;
    return this.sdk.getRemoteUnsettledAccountPublicKey(aliasInput);
  }

  async isAliasAvailable(aliasInput: string) {
    const alias = formatAliasInput(aliasInput);
    const isRegistered = await this.sdk.isAliasRegistered(alias);
    return !isRegistered;
  }

  async isValidRecipient(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return false;
    }

    const alias = formatAliasInput(aliasInput);
    return this.sdk.isAliasRegistered(alias);
  }

  async getAccountId(aliasInput: string) {
    if (!isValidAliasInput(aliasInput)) {
      return undefined;
    }

    const alias = formatAliasInput(aliasInput);
    return this.sdk.getAccountPublicKey(alias);
  }

  async getPendingBalance(assetId: number, ethAddress: EthAddress) {
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
    assetId: number,
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

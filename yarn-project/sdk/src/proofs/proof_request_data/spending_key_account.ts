import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Database } from '../../database/index.js';

export interface SpendingKeyAccount {
  spendingPublicKey: GrumpkinAddress;
  aliasHash: AliasHash;
  accountIndex: number;
  accountPath: HashPath;
}

export const getSpendingKeyAccount = async (
  spendingPublicKey: GrumpkinAddress,
  accountPublicKey: GrumpkinAddress,
  worldState: WorldState,
  db: Database,
): Promise<SpendingKeyAccount> => {
  if (spendingPublicKey.equals(accountPublicKey) || spendingPublicKey.equals(GrumpkinAddress.ZERO)) {
    return {
      spendingPublicKey: accountPublicKey,
      aliasHash: AliasHash.ZERO,
      accountIndex: 0,
      accountPath: worldState.buildZeroHashPath(WorldStateConstants.DATA_TREE_DEPTH),
    };
  } else {
    const aliasHash = (await db.getAlias(accountPublicKey))?.aliasHash;
    if (!aliasHash) {
      throw new Error('Account not registered or not fully synced.');
    }

    const spendingKey = await db.getSpendingKey(accountPublicKey, spendingPublicKey);
    if (spendingKey === undefined) {
      throw new Error('Unknown spending key.');
    }

    const immutableHashPath = HashPath.fromBuffer(spendingKey.hashPath);
    const accountIndex = spendingKey.treeIndex;
    const accountPath = await worldState.buildFullHashPath(accountIndex, immutableHashPath);
    return { spendingPublicKey, aliasHash, accountIndex, accountPath };
  }
};

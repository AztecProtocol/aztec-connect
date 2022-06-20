import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { Hasher, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Alias, SpendingKey } from '../database/database';

export interface GenesisData {
  aliases: Alias[];
  spendingKeys: SpendingKey[];
  subTreeRoots: Buffer[];
}

export function parseGenesisAliasesAndKeys(accounts: AccountData[]) {
  const aliases: Alias[] = [];
  const spendingKeys: SpendingKey[] = [];
  for (let i = 0; i < accounts.length; ++i) {
    const {
      alias: { aliasHash, address },
      signingKeys: { signingKey1, signingKey2 },
    } = accounts[i];
    const accountPublicKey = new GrumpkinAddress(address);

    aliases.push({
      accountPublicKey,
      aliasHash: new AliasHash(aliasHash),
      index: i * 2,
    });

    spendingKeys.push({
      userId: accountPublicKey,
      treeIndex: i * 2,
      key: signingKey1,
      hashPath: Buffer.alloc(0),
    });
    spendingKeys.push({
      userId: accountPublicKey,
      treeIndex: i * 2 + 1,
      key: signingKey2,
      hashPath: Buffer.alloc(0),
    });
  }
  return {
    aliases,
    spendingKeys,
  };
}

export async function getUserSpendingKeysFromGenesisData(
  userPublicKeys: GrumpkinAddress[],
  accountsData: Buffer,
  hasher: Hasher,
  rollupSize: number,
) {
  // get all of the account note commitments from the genesis store
  const accounts = InitHelpers.parseAccountTreeData(accountsData);
  const commitments = accounts.flatMap(x => [x.notes.note1, x.notes.note2]);
  const size = 1 << Math.ceil(Math.log2(rollupSize));
  const notesInSubtree = size * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX;

  // extract the spending keys and find those for the given users
  const aliasesAndKeys = parseGenesisAliasesAndKeys(accounts);
  const userSpendingKeys = aliasesAndKeys.spendingKeys.filter(key =>
    userPublicKeys.some(userKey => userKey.equals(key.userId)),
  );

  // for each spending key we want to generate the merkle sub tree that contains it's note
  // cache the generated merkle trees so we don't regenerate them unnecessarily
  const merkleTrees: { [key: number]: MemoryMerkleTree } = {};
  for (const key of userSpendingKeys) {
    const subTreeIndex = Math.floor(key.treeIndex / notesInSubtree);
    const subTreeStartNoteIndex = subTreeIndex * notesInSubtree;
    if (!merkleTrees[subTreeIndex]) {
      // not generated this sub tree before, generate it now
      const commitmentsForSubTree = commitments.slice(subTreeStartNoteIndex, subTreeStartNoteIndex + notesInSubtree);
      const zeroNotes = Array(notesInSubtree - commitmentsForSubTree.length).fill(MemoryMerkleTree.ZERO_ELEMENT);
      const fullTreeNotes = [...commitmentsForSubTree, ...zeroNotes];
      merkleTrees[subTreeIndex] = await MemoryMerkleTree.new(fullTreeNotes, hasher);
    }
    // retrieve the hash path for the note
    const hashPathForKey = merkleTrees[subTreeIndex].getHashPath(key.treeIndex - subTreeStartNoteIndex);
    key.hashPath = hashPathForKey.toBuffer();
  }
  return userSpendingKeys;
}

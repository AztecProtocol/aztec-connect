import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Note } from './note.js';

// For each input note we need to
// Determine if there is a hash path stored with the note
// If there is then concatenate that path with the hash path returned from the data tree for that note's subtree
// If there isn't then generate a 'zero' hash path of the full data tree depth
export const restoreNotePath = async (
  { treeNote, commitment, nullifier, allowChain, nullified, index, hashPath }: Note,
  worldState: WorldState,
) => {
  const fullHashPath = hashPath
    ? await worldState.buildFullHashPath(index!, HashPath.fromBuffer(hashPath))
    : worldState.buildZeroHashPath(WorldStateConstants.DATA_TREE_DEPTH);
  return new Note(treeNote, commitment, nullifier, allowChain, nullified, index, fullHashPath.toBuffer());
};

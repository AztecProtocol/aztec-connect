import { packInteractionNotes } from '../note_algorithms/defi_interaction_note';
import { RollupProofData } from '../rollup_proof';

const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

export class WorldStateConstants {
  public static EMPTY_DATA_ROOT = Buffer.from(
    '18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
    'hex',
  );
  public static EMPTY_NULL_ROOT = Buffer.from(
    '298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
    'hex',
  );
  // NOTE: root of the root_tree AFTER inserting the empty_data_root at index 0.
  public static EMPTY_ROOT_ROOT = Buffer.from(
    '2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
    'hex',
  );
  public static EMPTY_DEFI_ROOT = Buffer.from(
    '2e4ab7889ab3139204945f9e722c7a8fdb84e66439d787bd066c3d896dba04ea',
    'hex',
  );

  // value of a single empty interaction hash
  public static EMPTY_INTERACTION_HASH = Buffer.from(
    '2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4',
    'hex',
  );

  // value of a SHA256 of NUM_BRIDGE_CALLS of empty interaction hashes
  public static INITIAL_INTERACTION_HASH = packInteractionNotes([], numberOfBridgeCalls);
  public static DATA_TREE_DEPTH = 32;
  public static NUM_NEW_DATA_TREE_NOTES_PER_TX = 2;
}

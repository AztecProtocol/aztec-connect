import { RollupProofData } from '../rollup_proof';
import { WorldStateConstants } from '../world_state';
import { DefiInteractionNote, packInteractionNotes } from './defi_interaction_note';

const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

describe('defi interaction note', () => {
  it('convert interaction note to and form buffer', () => {
    const note = DefiInteractionNote.random();
    const buf = note.toBuffer();
    expect(buf.length).toBe(DefiInteractionNote.deserialize(buf, 0).adv);

    const recovered = DefiInteractionNote.fromBuffer(buf);
    expect(recovered).toEqual(note);
  });

  it('hash an array of empty interaction note', () => {
    const notes = [...Array(numberOfBridgeCalls)].map(() => DefiInteractionNote.EMPTY);
    const hash = packInteractionNotes(notes);
    expect(hash).toEqual(WorldStateConstants.INITIAL_INTERACTION_HASH);
  });
});

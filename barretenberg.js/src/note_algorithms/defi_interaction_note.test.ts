import { WorldStateConstants } from '../world_state';
import { DefiInteractionNote, packInteractionNotes } from './defi_interaction_note';

describe('defi interaction note', () => {
  it('convert interaction note to and form buffer', () => {
    const note = DefiInteractionNote.random();
    const buf = note.toBuffer();
    expect(buf.length).toBe(DefiInteractionNote.LENGTH);

    const recovered = DefiInteractionNote.fromBuffer(buf);
    expect(recovered.equals(note)).toBe(true);
    expect(recovered.bridgeId).toEqual(note.bridgeId);
    expect(recovered.nonce).toBe(note.nonce);
    expect(recovered.totalInputValue).toBe(note.totalInputValue);
    expect(recovered.totalOutputValueA).toBe(note.totalOutputValueA);
    expect(recovered.totalOutputValueB).toBe(note.totalOutputValueB);
    expect(recovered.result).toBe(note.result);
  });

  it('hash an array of empty interaction note', () => {
    const notes = [...Array(4)].map(() => DefiInteractionNote.EMPTY);
    const hash = packInteractionNotes(notes);
    expect(hash).toEqual(WorldStateConstants.INITIAL_INTERACTION_HASH);
  });
});

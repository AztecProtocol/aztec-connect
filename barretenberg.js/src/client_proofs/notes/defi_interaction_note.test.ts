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
    expect(hash).toEqual(Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'));
  });
});

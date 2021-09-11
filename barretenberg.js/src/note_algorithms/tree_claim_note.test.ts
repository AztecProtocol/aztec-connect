import { TreeClaimNote } from './tree_claim_note';

describe('tree_claim_note', () => {
  it('convert tree claim note to and from buffer', () => {
    const note = TreeClaimNote.random();
    const buf = note.toBuffer();
    expect(buf.length).toBe(TreeClaimNote.LENGTH);
    const recovered = TreeClaimNote.fromBuffer(buf);
    expect(recovered).toEqual(note);
  });
});

import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';

export class ClaimProof {
  constructor(
    public dataRoot: Buffer,
    public defiRoot: Buffer,

    public claimNoteIndex: number,
    public claimNotePath: HashPath,
    public claimNote: TreeClaimNote,

    public defiInteractionNotePath: HashPath,
    public defiInteractionNote: DefiInteractionNote,

    public outputValueA: bigint,
    public outputValueB: bigint,
  ) {}

  public toBuffer() {
    return Buffer.concat([
      this.dataRoot,
      this.defiRoot,

      numToUInt32BE(this.claimNoteIndex),
      this.claimNotePath.toBuffer(),
      this.claimNote.toBuffer(),

      this.defiInteractionNotePath.toBuffer(),
      this.defiInteractionNote.toBuffer(),

      toBufferBE(this.outputValueA, 32),
      toBufferBE(this.outputValueB, 32),
    ]);
  }

  public static fromBuffer(buf: Buffer) {
    const dataRoot = buf.slice(0, 32);
    let offset = 32;
    const defiRoot = buf.slice(offset, offset + 32);
    offset += 32;
    const claimNoteIndex = buf.readUInt32BE(offset);
    offset += 4;
    const claimNotePath = HashPath.deserialize(buf, offset);
    offset += claimNotePath.adv;
    const claimNote = TreeClaimNote.fromBuffer(buf.slice(offset));
    offset += TreeClaimNote.LENGTH;
    const defiInteractionNotePath = HashPath.deserialize(buf, offset);
    offset += defiInteractionNotePath.adv;
    const defiInteractionNote = DefiInteractionNote.fromBuffer(buf.slice(offset));
    offset += DefiInteractionNote.LENGTH;
    const outputValueA = toBigIntBE(buf.slice(offset, offset + 32));
    offset += 32;
    const outputValueB = toBigIntBE(buf.slice(offset, offset + 32));

    return new ClaimProof(
      dataRoot,
      defiRoot,
      claimNoteIndex,
      claimNotePath.elem,
      claimNote,
      defiInteractionNotePath.elem,
      defiInteractionNote,
      outputValueA,
      outputValueB,
    );
  }
}

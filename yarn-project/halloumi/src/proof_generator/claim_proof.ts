import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { DefiInteractionNote, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { Deserializer, Serializer } from '@aztec/barretenberg/serialize';

export class ClaimProof {
  constructor(
    public dataRoot: Buffer,
    public defiRoot: Buffer,

    public claimNoteIndex: number,
    public claimNotePath: HashPath,
    public claimNote: TreeClaimNote,

    public defiInteractionNoteIndex: number,
    public defiInteractionNotePath: HashPath,
    public defiInteractionNote: DefiInteractionNote,

    public outputValueA: bigint,
    public outputValueB: bigint,
  ) {}

  public toBuffer() {
    const serializer = new Serializer();
    serializer.buffer(this.dataRoot);
    serializer.buffer(this.defiRoot);
    serializer.uInt32(this.claimNoteIndex);
    serializer.buffer(this.claimNotePath.toBuffer());
    serializer.buffer(this.claimNote.toBuffer());
    serializer.uInt32(this.defiInteractionNoteIndex);
    serializer.buffer(this.defiInteractionNotePath.toBuffer());
    serializer.buffer(this.defiInteractionNote.toBuffer());
    serializer.bigInt(this.outputValueA);
    serializer.bigInt(this.outputValueB);

    return serializer.getBuffer();
  }

  static deserialize(buffer: Buffer, offset: number) {
    const des = new Deserializer(buffer, offset);
    const dataRoot = des.buffer(32);
    const defiRoot = des.buffer(32);
    const claimNoteIndex = des.uInt32();
    const claimNotePath = des.exec(HashPath.deserialize);
    const claimNote = des.exec(TreeClaimNote.deserialize);
    const defiInteractionNoteIndex = des.uInt32();
    const defiInteractionNotePath = des.exec(HashPath.deserialize);
    const defiInteractionNote = des.exec(DefiInteractionNote.deserialize);
    const outputValueA = des.bigInt();
    const outputValueB = des.bigInt();

    return {
      elem: new ClaimProof(
        dataRoot,
        defiRoot,
        claimNoteIndex,
        claimNotePath,
        claimNote,
        defiInteractionNoteIndex,
        defiInteractionNotePath,
        defiInteractionNote,
        outputValueA,
        outputValueB,
      ),
      adv: des.getOffset() - offset,
    };
  }

  public static fromBuffer(buf: Buffer) {
    return ClaimProof.deserialize(buf, 0).elem;
  }
}

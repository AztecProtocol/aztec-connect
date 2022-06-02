import { AliasHash } from '../../account_id';
import { EthAddress, GrumpkinAddress } from '../../address';
import { toBigIntBE, toBufferBE } from '../../bigint_buffer';
import { HashPath } from '../../merkle_tree';
import { ClaimNoteTxData, TreeNote } from '../../note_algorithms';
import { numToUInt32BE } from '../../serialize';

export class JoinSplitTx {
  constructor(
    public proofId: number,
    public publicValue: bigint,
    public publicOwner: EthAddress,
    public publicAssetId: number,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: TreeNote[],
    public outputNotes: TreeNote[],
    public claimNote: ClaimNoteTxData,
    public accountPrivateKey: Buffer,
    public aliasHash: AliasHash,
    public accountRequired: boolean,
    public accountIndex: number,
    public accountPath: HashPath,
    public spendingPublicKey: GrumpkinAddress,
    public backwardLink: Buffer,
    public allowChain: number,
  ) {}

  toBuffer() {
    return Buffer.concat([
      numToUInt32BE(this.proofId),
      toBufferBE(this.publicValue, 32),
      this.publicOwner.toBuffer32(),
      numToUInt32BE(this.publicAssetId),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,

      this.inputNotePaths[0].toBuffer(),
      this.inputNotePaths[1].toBuffer(),
      this.inputNotes[0].toBuffer(),
      this.inputNotes[1].toBuffer(),
      this.outputNotes[0].toBuffer(),
      this.outputNotes[1].toBuffer(),
      this.claimNote.toBuffer(),

      this.accountPrivateKey,
      this.aliasHash.toBuffer32(),
      Buffer.from([+this.accountRequired]),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.spendingPublicKey.toBuffer(),

      this.backwardLink,
      numToUInt32BE(this.allowChain),
    ]);
  }

  static fromBuffer(buf: Buffer) {
    let dataStart = 0;
    const proofId = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const publicValue = toBigIntBE(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const publicOwner = new EthAddress(buf.slice(dataStart, dataStart + 32));
    dataStart += 32;
    const publicAssetId = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const numInputNotes = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const inputNoteIndices = [buf.readUInt32BE(dataStart), buf.readUInt32BE(dataStart + 4)];
    dataStart += 8;
    const merkleRoot = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const inputNotePath0 = HashPath.deserialize(buf, dataStart);
    dataStart += inputNotePath0.adv;
    const inputNotePath1 = HashPath.deserialize(buf, dataStart);
    dataStart += inputNotePath1.adv;
    const inputNote0 = TreeNote.fromBuffer(buf.slice(dataStart));
    dataStart += TreeNote.SIZE;
    const inputNote1 = TreeNote.fromBuffer(buf.slice(dataStart));
    dataStart += TreeNote.SIZE;
    const outputNote0 = TreeNote.fromBuffer(buf.slice(dataStart));
    dataStart += TreeNote.SIZE;
    const outputNote1 = TreeNote.fromBuffer(buf.slice(dataStart));
    dataStart += TreeNote.SIZE;
    const claimNote = ClaimNoteTxData.fromBuffer(buf.slice(dataStart));
    dataStart += ClaimNoteTxData.SIZE;
    const accountPrivateKey = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const aliasHash = new AliasHash(buf.slice(dataStart + 4, dataStart + 32));
    dataStart += 32;
    const accountRequired = !!buf[dataStart];
    dataStart += 1;
    const accountIndex = buf.readUInt32BE(dataStart);
    dataStart += 4;
    const accountPath = HashPath.deserialize(buf, dataStart);
    dataStart += accountPath.adv;
    const spendingPublicKey = new GrumpkinAddress(buf.slice(dataStart, dataStart + 64));
    dataStart += 64;
    const backwardLink = buf.slice(dataStart, dataStart + 32);
    dataStart += 32;
    const allowChain = buf.readUInt32BE(dataStart);
    return new JoinSplitTx(
      proofId,
      publicValue,
      publicOwner,
      publicAssetId,
      numInputNotes,
      inputNoteIndices,
      merkleRoot,
      [inputNotePath0.elem, inputNotePath1.elem],
      [inputNote0, inputNote1],
      [outputNote0, outputNote1],
      claimNote,
      accountPrivateKey,
      aliasHash,
      accountRequired,
      accountIndex,
      accountPath.elem,
      spendingPublicKey,
      backwardLink,
      allowChain,
    );
  }
}

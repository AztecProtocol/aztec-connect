import { toBufferBE } from 'bigint-buffer';
import { Note } from '../note';
import { Signature } from '../signature';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { GrumpkinAddress, EthAddress } from '../../address';

export class EscapeHatchTx {
  constructor(
    public publicOutput: bigint,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public merkleRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public signature: Signature,
    public outputOwner: EthAddress,
    public accountIndex: number,
    public accountPath: HashPath,
    public accountNullifierPath: HashPath,
    public signingPubKey: GrumpkinAddress,
    public nullifierMerkleRoot: Buffer,
    public newNullifierRoots: Buffer[],
    public currentNullifierPaths: HashPath[],
    public newNullifierPaths: HashPath[],
    public newDataRoot: Buffer,
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
  ) {}

  toBuffer() {
    const inputNotePathBuffer = Buffer.concat(this.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat([...this.inputNotes].map(n => n.toBuffer()));
    const newNullifierRootsBuffer = Buffer.concat(this.newNullifierRoots);

    const currentNullifierPathsBuffer = Buffer.concat(this.currentNullifierPaths.map(p => p.toBuffer()));
    const newNullifierPathsBuffer = Buffer.concat(this.newNullifierPaths.map(p => p.toBuffer()));

    return Buffer.concat([
      toBufferBE(this.publicOutput, 32),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.merkleRoot,
      inputNotePathBuffer,
      noteBuffer,
      this.signature.toBuffer(),
      this.outputOwner.toBuffer32(),
      this.nullifierMerkleRoot,
      newNullifierRootsBuffer,
      currentNullifierPathsBuffer,
      newNullifierPathsBuffer,
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.accountNullifierPath.toBuffer(),
      this.signingPubKey.toBuffer(),
      this.newDataRoot,
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
    ]);
  }
}

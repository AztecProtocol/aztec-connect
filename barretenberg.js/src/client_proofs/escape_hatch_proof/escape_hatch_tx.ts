import { toBufferBE } from 'bigint-buffer';
import { Note } from '../note';
import { Signature } from '../signature';
import { HashPath } from '../../merkle_tree';
import { numToUInt32BE } from '../../serialize';
import { GrumpkinAddress, EthAddress } from '../../address';

export class EscapeHatchTx {
  constructor(
    public publicInput: bigint,
    public publicOutput: bigint,
    public numInputNotes: number,
    public inputNoteIndices: number[],
    public oldDataRoot: Buffer,
    public inputNotePaths: HashPath[],
    public inputNotes: Note[],
    public outputNotes: Note[],
    public signature: Signature,
    public inputOwner: EthAddress,
    public outputOwner: EthAddress,
    public accountIndex: number,
    public accountPath: HashPath,
    public signingPubKey: GrumpkinAddress,
    public rollupId: bigint,
    public dataStartIndex: bigint,
    public newDataRoot: Buffer,
    public oldDataPath: HashPath,
    public newDataPath: HashPath,
    public oldNullifierRoot: Buffer,
    public newNullifierRoots: Buffer[],
    public oldNullifierPaths: HashPath[],
    public newNullifierPaths: HashPath[],
    public accountNullifierPath: HashPath,
    public oldDataRootsRoot: Buffer,
    public newDataRootsRoot: Buffer,
    public oldDataRootPath: HashPath,
    public newDataRootsPath: HashPath,
  ) {}

  toBuffer() {
    const notePathBuffer = Buffer.concat(this.inputNotePaths.map(p => p.toBuffer()));
    const noteBuffer = Buffer.concat([...this.inputNotes, ...this.outputNotes].map(n => n.toBuffer()));
    const newNullifierRootsBuffer = Buffer.concat(this.newNullifierRoots);

    const oldNullifierPathsBuffer = Buffer.concat(this.oldNullifierPaths.map(p => p.toBuffer()));
    const newNullifierPathsBuffer = Buffer.concat(this.newNullifierPaths.map(p => p.toBuffer()));

    return Buffer.concat([
      toBufferBE(this.publicInput, 32),
      toBufferBE(this.publicOutput, 32),
      numToUInt32BE(this.numInputNotes),
      numToUInt32BE(this.inputNoteIndices[0]),
      numToUInt32BE(this.inputNoteIndices[1]),
      this.oldDataRoot,
      notePathBuffer,
      noteBuffer,
      this.signature.toBuffer(),
      this.inputOwner.toBuffer32(),
      this.outputOwner.toBuffer32(),
      numToUInt32BE(this.accountIndex),
      this.accountPath.toBuffer(),
      this.signingPubKey.toBuffer(),
      toBufferBE(this.rollupId, 32),
      toBufferBE(this.dataStartIndex, 32),
      this.newDataRoot,
      this.oldDataPath.toBuffer(),
      this.newDataPath.toBuffer(),
      this.oldNullifierRoot,
      newNullifierRootsBuffer,
      oldNullifierPathsBuffer,
      newNullifierPathsBuffer,
      this.accountNullifierPath.toBuffer(),
      this.oldDataRootsRoot,
      this.newDataRootsRoot,
      this.oldDataRootPath.toBuffer(),
      this.newDataRootsPath.toBuffer(),
    ]);
  }
}

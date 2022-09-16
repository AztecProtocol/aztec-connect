import { TreeNote } from '@aztec/barretenberg/note_algorithms';

export class Note {
  constructor(
    public treeNote: TreeNote,
    public commitment: Buffer,
    public nullifier: Buffer,
    public allowChain: boolean,
    public nullified: boolean,
    public index?: number,
    public hashPath?: Buffer,
  ) {}

  get assetId() {
    return this.treeNote.assetId;
  }

  get value() {
    return this.treeNote.value;
  }

  get owner() {
    return this.treeNote.ownerPubKey;
  }

  get ownerAccountRequired() {
    return this.treeNote.accountRequired;
  }

  get pending() {
    return this.index === undefined;
  }
}

export interface NoteJson {
  treeNote: Uint8Array;
  commitment: string;
  nullifier: string;
  allowChain: boolean;
  nullified: boolean;
  index?: number;
  hashPath?: string;
}

export const noteToJson = ({
  treeNote,
  commitment,
  nullifier,
  allowChain,
  nullified,
  index,
  hashPath,
}: Note): NoteJson => ({
  treeNote: new Uint8Array(treeNote.toBuffer()),
  commitment: commitment.toString('hex'),
  nullifier: nullifier.toString('hex'),
  allowChain,
  nullified,
  index,
  hashPath: hashPath?.toString('hex'),
});

export const noteFromJson = ({ treeNote, commitment, nullifier, allowChain, nullified, index, hashPath }: NoteJson) =>
  new Note(
    TreeNote.fromBuffer(Buffer.from(treeNote)),
    Buffer.from(commitment, 'hex'),
    Buffer.from(nullifier, 'hex'),
    allowChain,
    nullified,
    index,
    hashPath ? Buffer.from(hashPath, 'hex') : undefined,
  );

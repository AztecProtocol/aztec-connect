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

  get spendingKeyRequired() {
    return this.treeNote.accountRequired;
  }

  get pending() {
    return this.index === undefined;
  }
}

export interface NoteJson {
  treeNote: string;
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
  treeNote: treeNote.toBuffer().toString('base64'),
  commitment: commitment.toString('base64'),
  nullifier: nullifier.toString('base64'),
  allowChain,
  nullified,
  index,
  hashPath: hashPath?.toString('base64'),
});

export const noteFromJson = ({ treeNote, commitment, nullifier, allowChain, nullified, index, hashPath }: NoteJson) =>
  new Note(
    TreeNote.fromBuffer(Buffer.from(treeNote, 'base64')),
    Buffer.from(commitment, 'base64'),
    Buffer.from(nullifier, 'base64'),
    allowChain,
    nullified,
    index,
    hashPath ? Buffer.from(hashPath, 'base64') : undefined,
  );

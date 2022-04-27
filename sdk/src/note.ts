import { AccountId } from '@aztec/barretenberg/account_id';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';

export class Note {
  constructor(
    public treeNote: TreeNote,
    public commitment: Buffer,
    public nullifier: Buffer,
    public allowChain: boolean,
    public nullified: boolean,
    public index?: number,
  ) {}

  get assetId() {
    return this.treeNote.assetId;
  }

  get value() {
    return this.treeNote.value;
  }

  get owner() {
    return new AccountId(this.treeNote.ownerPubKey, this.treeNote.nonce);
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
}

export const noteToJson = ({ treeNote, commitment, nullifier, allowChain, nullified, index }: Note): NoteJson => ({
  treeNote: new Uint8Array(treeNote.toBuffer()),
  commitment: commitment.toString('hex'),
  nullifier: nullifier.toString('hex'),
  allowChain,
  nullified,
  index,
});

export const noteFromJson = ({ treeNote, commitment, nullifier, allowChain, nullified, index }: NoteJson) =>
  new Note(
    TreeNote.fromBuffer(Buffer.from(treeNote)),
    Buffer.from(commitment, 'hex'),
    Buffer.from(nullifier, 'hex'),
    allowChain,
    nullified,
    index,
  );

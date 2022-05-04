import { AccountId } from '@aztec/barretenberg/account_id';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Note } from '../../note';
import { accountIdTransformer, bigintTransformer } from './transformer';

@Entity({ name: 'note' })
export class NoteDao {
  @PrimaryColumn()
  public commitment!: Buffer;

  @Index({ unique: true })
  @Column()
  public nullifier!: Buffer;

  @Column()
  public noteSecret!: Buffer;

  @Column('blob', { transformer: [accountIdTransformer] })
  public owner!: AccountId;

  @Column()
  public creatorPubKey!: Buffer;

  @Column()
  public inputNullifier!: Buffer;

  @Column()
  public assetId!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public value!: bigint;

  @Column()
  public allowChain!: boolean;

  @Index({ unique: false })
  @Column({ nullable: true })
  public index?: number;

  @Index({ unique: false })
  @Column()
  public nullified!: boolean;

  @Column({ nullable: true })
  public hashPath?: Buffer;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (!this.hashPath) {
      delete this.hashPath;
    }
    if (this.index === null) {
      delete this.index;
    }
  }
}

export const noteToNoteDao = ({
  treeNote: { noteSecret, ownerPubKey, nonce, creatorPubKey, inputNullifier, assetId },
  commitment,
  nullifier,
  value,
  allowChain,
  index,
  nullified,
  hashPath,
}: Note) => ({
  commitment,
  nullifier,
  noteSecret,
  owner: new AccountId(ownerPubKey, nonce),
  creatorPubKey,
  inputNullifier,
  assetId,
  value,
  allowChain,
  nullified,
  index,
  hashPath,
});

export const noteDaoToNote = ({
  commitment,
  nullifier,
  noteSecret,
  owner,
  creatorPubKey,
  inputNullifier,
  assetId,
  value,
  allowChain,
  index,
  nullified,
  hashPath,
}: NoteDao) =>
  new Note(
    new TreeNote(owner.publicKey, value, assetId, owner.accountNonce, noteSecret, creatorPubKey, inputNullifier),
    commitment,
    nullifier,
    allowChain,
    nullified,
    index,
    hashPath,
  );

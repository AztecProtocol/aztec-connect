import { AssetId } from 'barretenberg/client_proofs';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Note } from '../../note';
import { AccountId } from '../../user';
import { bigintTransformer, accountIdTransformer } from './transformer';

@Entity({ name: 'note' })
export class NoteDao implements Note {
  @PrimaryColumn()
  public index!: number;

  @Column()
  public assetId!: AssetId;

  @Column('bigint', { transformer: [bigintTransformer] })
  public value!: bigint;

  @Column()
  public dataEntry!: Buffer;

  @Column()
  public secret!: Buffer;

  @Column()
  public viewingKey!: Buffer;

  @Index({ unique: true })
  @Column()
  public nullifier!: Buffer;

  @Index({ unique: false })
  @Column()
  public nullified!: boolean;

  @Column('blob', { transformer: [accountIdTransformer] })
  public owner!: AccountId;
}

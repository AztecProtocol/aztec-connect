import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Note } from '../../note';
import { bigintTransformer } from './transformer';

@Entity({ name: 'note' })
export class NoteDao implements Note {
  @PrimaryColumn()
  public index!: number;

  @Column()
  public assetId!: number;

  @Column('bigint', { transformer: [bigintTransformer] })
  public value!: bigint;

  @Column()
  public dataEntry!: Buffer;

  @Column()
  public viewingKey!: Buffer;

  @Column()
  public encrypted!: Buffer;

  @Index({ unique: false })
  @Column()
  public nullifier!: Buffer;

  @Index({ unique: false })
  @Column()
  public nullified!: boolean;

  @Column()
  public owner!: Buffer;
}

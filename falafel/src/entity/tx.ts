import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BlockDao } from './block';

@Entity({ name: 'tx' })
export class TxDao {
  @PrimaryGeneratedColumn()
  public id!: number;

  @ManyToOne(type => BlockDao, a => a.id, { onDelete: 'CASCADE' })
  public blockNum!: number;

  @Column()
  public merkleRoot!: Buffer;

  @Column()
  public newNote1!: Buffer;

  @Column()
  public newNote2!: Buffer;

  @Column("bigint")
  public nullifier1!: string;

  @Column("bigint")
  public nullifier2!: string;

  @Column("bigint")
  public publicInput!: string;

  @Column("bigint")
  public publicOutput!: string;
}

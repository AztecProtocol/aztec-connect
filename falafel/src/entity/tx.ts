import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RollupDao } from './rollup';

@Entity({ name: 'tx' })
export class TxDao {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Index({ unique: true })
  @Column({ length: 32 })
  public txId!: Buffer;

  @ManyToOne(type => RollupDao, r => r.txs, { onDelete: 'SET NULL' })
  public rollup?: RollupDao;

  @Column({ length: 32 })
  public merkleRoot!: Buffer;

  @Column({ length: 64 })
  public newNote1!: Buffer;

  @Column({ length: 64 })
  public newNote2!: Buffer;

  @Column({ length: 16 })
  public nullifier1!: Buffer;

  @Column({ length: 16 })
  public nullifier2!: Buffer;

  @Column({ length: 32 })
  public publicInput!: Buffer;

  @Column({ length: 32 })
  public publicOutput!: Buffer;

  @Column()
  public proofData!: Buffer;

  @Column()
  public viewingKey1!: Buffer;

  @Column()
  public viewingKey2!: Buffer;

  @Column({ nullable: true })
  public signature?: Buffer;

  @Column()
  public created!: Date;
}

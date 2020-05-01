import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RollupDao } from './rollup';

@Entity({ name: 'rollup_tx' })
export class RollupTxDao {
  @PrimaryGeneratedColumn()
  public id!: number;

  @ManyToOne(type => RollupDao, a => a.id, { onDelete: 'CASCADE' })
  public rollupId!: number;

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
}

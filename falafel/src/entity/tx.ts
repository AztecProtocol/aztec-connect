import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { RollupDao } from './rollup';

@Entity({ name: 'tx' })
export class TxDao {
  @PrimaryColumn({ length: 32 })
  public txId!: Buffer;

  @ManyToOne(type => RollupDao, r => r.txs, { onDelete: 'SET NULL' })
  public rollup?: RollupDao;

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

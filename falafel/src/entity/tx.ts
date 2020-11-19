import { AfterLoad, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { RollupDao } from './rollup';

@Entity({ name: 'tx' })
export class TxDao {
  public constructor(init?: Partial<TxDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn({ length: 32 })
  public txId!: Buffer;

  @ManyToOne(() => RollupDao, r => r.txs, { onDelete: 'SET NULL' })
  public rollup?: RollupDao;

  @Column()
  public proofData!: Buffer;

  @Column()
  public viewingKey1!: Buffer;

  @Column()
  public viewingKey2!: Buffer;

  @Column({ nullable: true })
  public signature?: Buffer;

  @Column({ unique: true })
  public nullifier1!: Buffer;

  @Column({ unique: true })
  public nullifier2!: Buffer;

  @Column({ nullable: true })
  public dataRootsIndex?: number;

  @Column()
  public created!: Date;

  @AfterLoad()
  afterLoad() {
    if (this.rollup === null) {
      this.rollup = undefined;
    }
  }
}

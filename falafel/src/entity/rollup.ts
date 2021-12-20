import { Column, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { bufferColumn } from './init_entities';
import { RollupProofDao } from './rollup_proof';

@Entity({ name: 'rollup' })
export class RollupDao {
  public constructor(init?: Partial<RollupDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public id!: number;

  @Column(...bufferColumn({ unique: true, length: 32 }))
  public dataRoot!: Buffer;

  @OneToOne(() => RollupProofDao, rollupPoof => rollupPoof.rollup, { cascade: true })
  public rollupProof!: RollupProofDao;

  @Column(...bufferColumn())
  public viewingKeys!: Buffer;

  @Column()
  public created!: Date;

  // Null until calldata computed.
  @Column(...bufferColumn({ nullable: true }))
  public callData!: Buffer;

  // Null until tx sent.
  @Column(...bufferColumn({ nullable: true, length: 32 }))
  public ethTxHash!: Buffer;

  // Null until mined.
  @Column(...bufferColumn({ nullable: true, length: 32 }))
  public gasPrice!: Buffer;

  // Null until mined.
  @Column({ nullable: true })
  public gasUsed!: number;

  // Null until mined.
  @Column({ nullable: true })
  public mined!: Date;
}

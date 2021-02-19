import { Column, Entity, Index, OneToOne, PrimaryColumn } from 'typeorm';
import { RollupProofDao } from './rollup_proof';

@Entity({ name: 'rollup' })
export class RollupDao {
  public constructor(init?: Partial<RollupDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public id!: number;

  @Index({ unique: true })
  @Column()
  public dataRoot!: Buffer;

  @OneToOne(() => RollupProofDao, rollupPoof => rollupPoof.rollup, { cascade: true })
  public rollupProof!: RollupProofDao;

  @Column()
  public viewingKeys!: Buffer;

  @Column()
  public created!: Date;

  // Null until calldata computed.
  @Column({ nullable: true })
  public callData!: Buffer;

  // Null until tx sent.
  @Column({ nullable: true })
  public ethTxHash!: Buffer;

  // Null until mined.
  @Column({ nullable: true })
  public gasPrice!: Buffer;

  // Null until mined.
  @Column({ nullable: true })
  public gasUsed!: number;

  // Null until mined.
  @Column({ nullable: true })
  public mined!: Date;
}

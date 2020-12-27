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

  @Column({ nullable: true })
  public ethTxHash!: Buffer;

  @Column({ default: false })
  public mined!: boolean;
}

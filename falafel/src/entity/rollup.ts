import { TxHash } from '@aztec/barretenberg/tx_hash';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { AssetMetricsDao } from './asset_metrics';
import { RollupProofDao } from './rollup_proof';
import { txHashTransformer } from './transformer';

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

  @OneToMany(() => AssetMetricsDao, am => am.rollup, { cascade: true })
  public assetMetrics!: AssetMetricsDao[];

  @Column()
  public created!: Date;

  // Null until calldata computed.
  @Column({ nullable: true })
  public callData?: Buffer;

  // Null until mined and events fetched.
  @Column({ nullable: true })
  public interactionResult?: Buffer;

  // Null until tx sent.
  @Column('blob', { nullable: true, transformer: [txHashTransformer] })
  public ethTxHash?: TxHash;

  // Null until mined.
  @Column({ nullable: true })
  public gasPrice?: Buffer;

  // Null until mined.
  @Column({ nullable: true })
  public gasUsed?: number;

  // Null until mined.
  @Column({ nullable: true })
  public mined?: Date;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (!this.callData) {
      delete this.callData;
    }
    if (!this.ethTxHash) {
      delete this.ethTxHash;
    }
    if (this.gasPrice === null) {
      delete this.gasPrice;
    }
    if (this.gasUsed === null) {
      delete this.gasUsed;
    }
    if (!this.mined) {
      delete this.mined;
    }
  }
}

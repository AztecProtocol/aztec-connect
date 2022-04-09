import { TxHash } from '@aztec/barretenberg/blockchain';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { AssetMetricsDao } from './asset_metrics';
import { bufferColumn } from './init_entities';
import { RollupProofDao } from './rollup_proof';
import { txHashTransformer } from './transformer';

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

  @OneToMany(() => AssetMetricsDao, am => am.rollup, { cascade: true })
  public assetMetrics!: AssetMetricsDao[];

  // @Column(...bufferColumn())
  // public viewingKeys!: Buffer;

  @Column()
  public created!: Date;

  // Null until computed.
  @Column(...bufferColumn({ nullable: true }))
  public processRollupCalldata?: Buffer;

  // Null until mined and events fetched.
  @Column(...bufferColumn({ nullable: true }))
  public interactionResult?: Buffer;

  // Null until tx sent.
  @Column(...bufferColumn({ nullable: true, length: 32, transformer: [txHashTransformer] }))
  public ethTxHash?: TxHash;

  // Null until mined.
  @Column(...bufferColumn({ nullable: true, length: 32 }))
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
    if (!this.processRollupCalldata) {
      delete this.processRollupCalldata;
    }
    if (!this.interactionResult) {
      delete this.interactionResult;
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

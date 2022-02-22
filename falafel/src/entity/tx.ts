import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { bufferColumn } from './init_entities';
import { RollupProofDao } from './rollup_proof';
import { bigintTransformer } from './transformer';

@Entity({ name: 'tx' })
export class TxDao {
  public constructor(init?: Partial<TxDao>) {
    Object.assign(this, init);
  }

  // Cannot use id as primary as it's a Buffer and typeorm has bugs...
  // To workaround, compute the hex string form and use that as primary.
  // WARNING: You will *not* be able to verify this in the tests. It only shows up outside a jest context.
  // You can imagine my pain.
  @PrimaryColumn()
  public internalId!: string;

  // To be treated as primary key.
  @Column(...bufferColumn({ unique: true, length: 32 }))
  public id!: Buffer;

  @ManyToOne(() => RollupProofDao, r => r.txs, { onDelete: 'SET NULL' })
  @JoinColumn()
  @Index()
  public rollupProof?: RollupProofDao;

  @Column(...bufferColumn())
  public proofData!: Buffer;

  @Column(...bufferColumn())
  public offchainTxData!: Buffer;

  // Nullable, as only deposits have signatures.
  @Column(...bufferColumn({ nullable: true, length: 64 }))
  public signature?: Buffer;

  @Column(...bufferColumn({ unique: true, nullable: true, length: 32 }))
  public nullifier1?: Buffer;

  @Column(...bufferColumn({ unique: true, nullable: true, length: 32 }))
  public nullifier2?: Buffer;

  // Nullable, as txs discovered on chain have no data root.
  @Column({ nullable: true })
  public dataRootsIndex?: number;

  @Column()
  @Index()
  public txType!: number;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  @Index()
  public mined?: Date;

  @Column('text', { transformer: [bigintTransformer] })
  public excessGas!: bigint;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (!this.rollupProof) {
      delete this.rollupProof;
    }
    if (!this.signature) {
      delete this.signature;
    }
    if (this.dataRootsIndex === null) {
      delete this.dataRootsIndex;
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

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
import { RollupProofDao } from './rollup_proof';

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
  @Column({ unique: true })
  public id!: Buffer;

  @ManyToOne(() => RollupProofDao, r => r.txs, { onDelete: 'SET NULL' })
  @JoinColumn()
  @Index()
  public rollupProof?: RollupProofDao | null;

  @Column()
  public proofData!: Buffer;

  @Column()
  public offchainTxData!: Buffer;

  // Nullable, as only deposits have signatures.
  @Column({ nullable: true })
  public signature?: Buffer;

  @Column({ unique: true, nullable: true })
  public nullifier1?: Buffer;

  @Column({ unique: true, nullable: true })
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

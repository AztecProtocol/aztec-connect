import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
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
  @PrimaryColumn()
  private internalId!: string;

  // To be treated as primary key.
  @Column({ unique: true })
  public id!: Buffer;

  @ManyToOne(() => RollupProofDao, r => r.txs, { onDelete: 'SET NULL' })
  @JoinColumn()
  public rollupProof?: RollupProofDao;

  @Column()
  public proofData!: Buffer;

  @Column()
  public viewingKey1!: Buffer;

  @Column()
  public viewingKey2!: Buffer;

  // Nullable, as only deposits have signatures.
  @Column({ nullable: true })
  public signature?: Buffer;

  @Column({ unique: true })
  public nullifier1!: Buffer;

  @Column({ unique: true })
  public nullifier2!: Buffer;

  // Nullable, as txs discovered on chain have no data root.
  @Column({ nullable: true })
  public dataRootsIndex?: number;

  @Column()
  public created!: Date;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (this.rollupProof === null) {
      delete this.rollupProof;
    }
    if (this.signature === null) {
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

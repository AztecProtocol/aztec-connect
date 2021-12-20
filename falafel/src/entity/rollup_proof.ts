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
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { bufferColumn } from './init_entities';
import { RollupDao } from './rollup';
import { TxDao } from './tx';

@Entity({ name: 'rollup_proof' })
export class RollupProofDao {
  public constructor(init?: Partial<RollupProofDao>) {
    Object.assign(this, init);
  }

  // Cannot use id as primary as it's a Buffer and typeorm has bugs...
  // To workaround, compute the hex string form and use that as primary.
  @PrimaryColumn()
  public internalId!: string;

  // To be treated as primary key.
  @Column(...bufferColumn({ unique: true, length: 32 }))
  public id!: Buffer;

  @OneToMany(() => TxDao, tx => tx.rollupProof, { cascade: true })
  public txs!: TxDao[];

  @Column()
  @Index()
  public rollupSize!: number;

  @Column()
  public dataStartIndex!: number;

  @Column(...bufferColumn())
  public proofData!: Buffer;

  @Column()
  public created!: Date;

  @OneToOne(() => RollupDao, rollup => rollup.rollupProof, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  rollup?: RollupDao;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (this.rollup === null) {
      delete this.rollup;
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

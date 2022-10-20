import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
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
  Relation,
} from 'typeorm';
import { bufferColumn } from './init_entities.js';
import { RollupDao } from './rollup.js';
import { TxDao } from './tx.js';

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
  public txs!: Relation<TxDao>[];

  @Column()
  @Index()
  public rollupSize!: number;

  @Column()
  public dataStartIndex!: number;

  @Column(...bufferColumn())
  public encodedProofData!: Buffer;

  @Column()
  public created!: Date;

  @OneToOne(() => RollupDao, rollup => rollup.rollupProof, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  rollup?: Relation<RollupDao>;

  @AfterInsert()
  @AfterUpdate()
  deleteFalseyProperties() {
    if (!this.rollup) {
      delete this.rollup;
    }
  }

  @AfterLoad()
  afterLoad() {
    this.deleteFalseyProperties();
    if (this.txs && this.txs.length) {
      // TxDaos on the RollupProofDao are not guaranteed to be in the order they are within the rollup.
      // Sort our TxDaos to be in rollup order.
      // We will need to decode the proof data into the RollupProofData type
      // Then extract the txIds from the inner proof data objects
      const decodedProofData = RollupProofData.decode(this.encodedProofData);
      const txIds = decodedProofData.getNonPaddingTxIds();
      this.txs = txIds.map(id => this.txs.find(tx => tx.id.equals(id))!);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

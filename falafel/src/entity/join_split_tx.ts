import { EthAddress } from 'barretenberg/address';
import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { bigintTransformer, ethAddressTransformer } from './transformer';
import { TxDao } from './tx';

@Entity({ name: 'join_split_tx' })
export class JoinSplitTxDao {
  public constructor(init?: Partial<JoinSplitTxDao>) {
    Object.assign(this, init);
  }

  // Cannot use id as primary as it's a Buffer and typeorm has bugs...
  // To workaround, compute the hex string form and use that as primary.
  @PrimaryColumn()
  @OneToOne(() => TxDao, tx => tx.internalId, { onDelete: 'CASCADE' })
  @JoinColumn()
  private internalId!: string;

  // To be treated as primary key.
  @Column({ unique: true })
  public id!: Buffer;

  @Column('bigint', { transformer: [bigintTransformer] })
  public publicInput!: bigint;

  @Column('bigint', { transformer: [bigintTransformer] })
  public publicOutput!: bigint;

  @Column()
  @Index()
  public assetId!: number;

  @Column('blob', { transformer: [ethAddressTransformer] })
  @Index()
  public inputOwner!: EthAddress;

  @Column('blob', { transformer: [ethAddressTransformer] })
  public outputOwner!: EthAddress;

  @Column()
  public created!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

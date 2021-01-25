import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'join_split_tx' })
export class JoinSplitTxDao {
  public constructor(init?: Partial<JoinSplitTxDao>) {
    Object.assign(this, init);
  }

  // Cannot use id as primary as it's a Buffer and typeorm has bugs...
  // To workaround, compute the hex string form and use that as primary.
  @PrimaryColumn()
  private internalId!: string;

  // To be treated as primary key.
  @Column({ unique: true })
  public id!: Buffer;

  @Column()
  public publicInput!: Buffer;

  @Column()
  public publicOutput!: Buffer;

  @Column()
  @Index()
  public assetId!: number;

  @Column()
  public inputOwner!: Buffer;

  @Column()
  public outputOwner!: Buffer;

  @Column()
  public created!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account_tx' })
@Index(['nonce', 'accountPubKey'])
export class AccountTxDao {
  public constructor(init?: Partial<AccountTxDao>) {
    Object.assign(this, init);
  }

  // Cannot use id as primary as it's a Buffer and typeorm has bugs...
  // To workaround, compute the hex string form and use that as primary.
  @PrimaryColumn()
  private internalId!: string;

  // To be treated as primary key.
  @Column({ unique: true })
  public id!: Buffer;

  @Index({ unique: false })
  @Column()
  public accountPubKey!: Buffer;

  @Index({ unique: false })
  @Column()
  public aliasHash!: Buffer;

  @Column()
  public nonce!: number;

  @Column()
  public spendingKey1!: Buffer;

  @Column()
  public spendingKey2!: Buffer;

  @Column()
  public created!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  before() {
    this.internalId = this.id.toString('hex');
  }
}

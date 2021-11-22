import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account' })
@Index(['nonce'], { unique: false })
export class AccountDao {
  public constructor(init?: AccountDao) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public aliasHash!: Buffer;

  @PrimaryColumn()
  public accountPubKey!: Buffer;

  @PrimaryColumn()
  public nonce!: number;

  @Column({ nullable: true })
  @Index({ unique: true })
  public txId?: Buffer;
}

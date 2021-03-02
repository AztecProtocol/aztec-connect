import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account' })
@Index(['aliasHash', 'nonce'])
@Index(['accountPubKey', 'nonce'])
export class AccountDao {
  @PrimaryColumn()
  public aliasHash!: Buffer;

  @Column()
  public accountPubKey!: Buffer;

  @Column()
  public nonce!: number;
}

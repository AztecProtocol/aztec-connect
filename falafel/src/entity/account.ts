import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'account' })
export class AccountDao {
  @PrimaryColumn()
  public aliasHash!: Buffer;

  @Column()
  @Index()
  public publicKey!: Buffer;
}

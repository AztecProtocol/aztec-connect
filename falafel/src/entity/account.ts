import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { TxDao } from './tx';

@Entity({ name: 'account' })
@Index(['aliasHash', 'nonce'], { unique: true })
@Index(['accountPubKey', 'nonce'], { unique: false })
export class AccountDao {
  public constructor(init?: AccountDao) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public aliasHash!: Buffer;

  @OneToOne(() => TxDao, tx => tx.id, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  public tx?: TxDao;

  @Column()
  public accountPubKey!: Buffer;

  @Column()
  public nonce!: number;
}

import { Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { bufferColumn } from './init_entities';
import { TxDao } from './tx';

@Entity({ name: 'account' })
export class AccountDao {
  public constructor(init?: AccountDao) {
    Object.assign(this, init);
  }

  @PrimaryColumn(...bufferColumn({ length: 32 }))
  public aliasHash!: Buffer;

  @PrimaryColumn(...bufferColumn({ length: 64 }))
  public accountPubKey!: Buffer;

  @PrimaryColumn()
  @Index({ unique: false })
  public nonce!: number;

  @OneToOne(() => TxDao, tx => tx.id, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  public tx?: TxDao;
}

import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { bufferColumn } from './init_entities';
import { TxDao } from './tx';

@Entity({ name: 'account' })
export class AccountDao {
  public constructor(init?: AccountDao) {
    Object.assign(this, init);
  }

  @PrimaryColumn(...bufferColumn({ length: 64 }))
  public accountPublicKey!: Buffer;

  @Column(...bufferColumn({ length: 32 }))
  @Index({ unique: false })
  public aliasHash!: Buffer;

  @OneToOne(() => TxDao, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  public tx?: TxDao;
}

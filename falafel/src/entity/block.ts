import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { TxDao } from './tx';

@Entity({ name: 'block' })
export class BlockDao {
  @PrimaryColumn()
  public id!: number;

  @Column()
  public created!: Date;

  @OneToMany(
    type => TxDao,
    tx => tx.blockNum,
    { cascade: true },
  )
  public txs!: TxDao[];
}

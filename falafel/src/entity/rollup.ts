import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { RollupTxDao } from './rollup_tx';

@Entity({ name: 'rollup' })
export class RollupDao {
  @PrimaryColumn()
  public id!: number;

  @Column()
  public created!: Date;

  @OneToMany(
    type => RollupTxDao,
    tx => tx.rollupId,
    { cascade: true },
  )
  public txs!: RollupTxDao[];

  @Column({ nullable: true })
  public ethBlock?: number;

  @Column({ nullable: true })
  public ethTxHash?: Buffer;
}

import { Column, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { TxDao } from './tx';

export const rollupStatus = <const>['CREATING', 'CREATED', 'PUBLISHED', 'SETTLED'];

export type RollupStatus = typeof rollupStatus[number];

@Entity({ name: 'rollup' })
export class RollupDao {
  @PrimaryColumn()
  public id!: number;

  @Column()
  public hash!: Buffer;

  @Index({ unique: true })
  @Column()
  public dataRoot!: Buffer;

  @OneToMany(() => TxDao, tx => tx.rollup, { cascade: true })
  public txs!: TxDao[];

  @Column({ nullable: true })
  public proofData?: Buffer;

  @Column()
  public viewingKeys!: Buffer;

  @Column({ nullable: true })
  public ethTxHash?: Buffer;

  @Index()
  @Column()
  public status!: RollupStatus;

  @Column()
  public created!: Date;
}

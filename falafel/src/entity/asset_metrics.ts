import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { RollupDao } from './rollup';
import { bigintTransformer } from './transformer';

@Entity({ name: 'asset_metrics' })
export class AssetMetricsDao {
  public constructor(init?: AssetMetricsDao) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public rollupId!: number;

  @PrimaryColumn()
  public assetId!: number;

  @ManyToOne(() => RollupDao, rollup => rollup.id, { onDelete: 'CASCADE' })
  public rollup!: RollupDao;

  // Contract asset balance for this rollup.
  @Column('text', { transformer: [bigintTransformer] })
  public contractBalance = BigInt(0);

  // Accumulated sum of every join-split deposit.
  @Column('text', { transformer: [bigintTransformer] })
  public totalDeposited = BigInt(0);

  // Accumulated sum of every join-split withdraw.
  @Column('text', { transformer: [bigintTransformer] })
  public totalWithdrawn = BigInt(0);

  // Accumulated sum of every join-split defi deposit.
  @Column('text', { transformer: [bigintTransformer] })
  public totalDefiDeposited = BigInt(0);

  // Accumulated sum of every claim proof output.
  @Column('text', { transformer: [bigintTransformer] })
  public totalDefiClaimed = BigInt(0);

  // Accumulated sum of fees.
  @Column('text', { transformer: [bigintTransformer] })
  public totalFees = BigInt(0);
}

import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { RollupDao } from './rollup';
import { bigintTransformer } from './transformer';

@Entity({ name: 'bridge_metrics' })
export class BridgeMetricsDao {
  public constructor(init?: Partial<BridgeMetricsDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public rollupId!: number;

  @PrimaryColumn('text', { transformer: [bigintTransformer] })
  public bridgeId!: bigint; // TODO rename to bridgeCallData

  // number of transactions for bridge in rollup
  @Column({ nullable: true })
  public numTxs?: number;

  // total number of transactions for bridge
  @Column({ nullable: true })
  public totalNumTxs?: number;

  // gas accrued in rollup for bridge
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public gas = BigInt(0);

  // total gas accrued for bridge
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public totalGasAccrued = BigInt(0);

  // total gas cost for bridge
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public totalGas = BigInt(0);

  // gas price when rollup mined
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public gasPrice!: bigint;

  // fees collected in USD for bridge in rollup
  @Column('float', { nullable: true })
  public usdFees?: number;

  // total fees collected in USD for bridge
  @Column('float', { nullable: true })
  public totalUsdFees?: number;

  // cost for bridge in USD for rollup
  @Column('float', { nullable: true })
  public usdCost?: number;

  // total cost for bridge in USD
  @Column('float', { nullable: true })
  public totalUsdCost?: number;

  // total number of times the bridge has been called by Aztec publishing rollups
  @Column({ nullable: true })
  public totalAztecCalls?: number;

  // total deposit value for this rollup
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public depositValue = BigInt(0);

  // total deposit value for this bridge
  @Column('text', { transformer: [bigintTransformer], default: '0' })
  public totalDepositValue = BigInt(0);

  @ManyToOne(() => RollupDao, rollup => rollup.id, { onDelete: 'CASCADE' })
  public rollup!: RollupDao;

  @Column({ default: true })
  public publishedByProvider!: boolean;
}

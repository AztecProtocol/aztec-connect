import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountId } from '../../user';
import { accountIdTransformer, bigintTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'utilTx' })
export class UtilTxDao {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column()
  public assetId!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public txFee!: bigint;

  @Index({ unique: true })
  @Column()
  public forwardLink!: Buffer;
}

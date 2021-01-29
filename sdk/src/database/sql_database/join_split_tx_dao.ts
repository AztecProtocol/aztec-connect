import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { TxHash } from 'barretenberg/rollup_provider';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountId } from '../../user';
import { UserJoinSplitTx } from '../../user_tx';
import { bigintTransformer, txHashTransformer, accountIdTransformer, ethAddressTransformer } from './transformer';

@Entity({ name: 'joinSplitTx' })
@Index(['txHash', 'userId'], { unique: true })
export class JoinSplitTxDao implements UserJoinSplitTx {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column()
  public assetId!: number;

  @Column('bigint', { transformer: [bigintTransformer] })
  public publicInput!: bigint;

  @Column('bigint', { transformer: [bigintTransformer] })
  public publicOutput!: bigint;

  @Column('bigint', { transformer: [bigintTransformer] })
  public privateInput!: bigint;

  @Column('bigint', { transformer: [bigintTransformer] })
  public recipientPrivateOutput!: bigint;

  @Column('bigint', { transformer: [bigintTransformer] })
  public senderPrivateOutput!: bigint;

  @Column('blob', { transformer: [ethAddressTransformer], nullable: true })
  public inputOwner?: EthAddress;

  @Column('blob', { transformer: [ethAddressTransformer], nullable: true })
  public outputOwner?: EthAddress;

  @Column()
  public ownedByUser!: boolean;

  @Column()
  public settled!: boolean;

  @Column()
  public created!: Date;
}

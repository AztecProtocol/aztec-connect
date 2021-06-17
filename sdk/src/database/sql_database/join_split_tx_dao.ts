import { EthAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountId } from '../../user';
import { UserJoinSplitTx } from '../../user_tx';
import { accountIdTransformer, bigintTransformer, ethAddressTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'joinSplitTx' })
@Index(['txHash', 'userId'], { unique: true })
export class JoinSplitTxDao implements UserJoinSplitTx {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column()
  public assetId!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public publicInput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public publicOutput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public privateInput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public recipientPrivateOutput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public senderPrivateOutput!: bigint;

  @Column('blob', { transformer: [ethAddressTransformer], nullable: true })
  public inputOwner?: EthAddress;

  @Column('blob', { transformer: [ethAddressTransformer], nullable: true })
  public outputOwner?: EthAddress;

  @Column()
  public ownedByUser!: boolean;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  public settled?: Date;
}

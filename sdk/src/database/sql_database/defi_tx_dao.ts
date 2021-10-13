import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountId } from '../../user';
import { accountIdTransformer, bigintTransformer, bridgeIdTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'defiTx' })
export class DefiTxDao {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @Index({ unique: false })
  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column('blob', { transformer: [bridgeIdTransformer] })
  public bridgeId!: BridgeId;

  @Column('text', { transformer: [bigintTransformer] })
  public depositValue!: bigint;

  @Column()
  public partialStateSecret!: Buffer;

  @Column('text', { transformer: [bigintTransformer] })
  public txFee!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public outputValueA!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public outputValueB!: bigint;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  public settled?: Date;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (this.settled === null) {
      delete this.settled;
    }
  }
}

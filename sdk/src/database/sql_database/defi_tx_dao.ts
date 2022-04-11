import { AccountId } from '@aztec/barretenberg/account_id';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { accountIdTransformer, bigintTransformer, bridgeIdTransformer, txIdTransformer } from './transformer';

@Entity({ name: 'defiTx' })
export class DefiTxDao {
  @PrimaryColumn('blob', { transformer: [txIdTransformer] })
  public txId!: TxId;

  @Index({ unique: false })
  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column('blob', { transformer: [bridgeIdTransformer] })
  public bridgeId!: BridgeId;

  @Column('text', { transformer: [bigintTransformer] })
  public depositValue!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public txFee!: bigint;

  @Column()
  public partialStateSecret!: Buffer;

  @Column()
  public txRefNo!: number;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  public settled?: Date;

  @Index({ unique: false })
  @Column()
  public interactionNonce!: number;

  @Column()
  public isAsync!: boolean;

  @Column()
  public success!: boolean;

  @Column('text', { transformer: [bigintTransformer] })
  public outputValueA!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public outputValueB!: bigint;

  @Column({ nullable: true })
  public finalised?: Date;

  @Column({ nullable: true })
  public claimSettled?: Date;

  @Column('blob', { nullable: true, transformer: [txIdTransformer] })
  public claimTxId?: TxId;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  afterLoad() {
    if (this.settled === null) {
      delete this.settled;
    }
    if (this.finalised === null) {
      delete this.finalised;
    }
    if (this.claimSettled === null) {
      delete this.claimSettled;
    }
    if (this.claimTxId === null) {
      delete this.claimTxId;
    }
  }
}

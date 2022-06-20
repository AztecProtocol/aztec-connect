import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { CorePaymentTx } from '../../core_tx';
import { bigintTransformer, ethAddressTransformer, grumpkinAddressTransformer, txIdTransformer } from './transformer';

@Entity({ name: 'paymentTx' })
@Index(['txId', 'userId'], { unique: true })
export class PaymentTxDao implements CorePaymentTx {
  @PrimaryColumn('blob', { transformer: [txIdTransformer] })
  public txId!: TxId;

  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public userId!: GrumpkinAddress;

  @Column()
  public proofId!: number;

  @Column()
  public assetId!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public publicValue!: bigint;

  @Column('blob', { transformer: [ethAddressTransformer], nullable: true })
  public publicOwner!: EthAddress | undefined;

  @Column('text', { transformer: [bigintTransformer] })
  public privateInput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public recipientPrivateOutput!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public senderPrivateOutput!: bigint;

  @Column()
  public isRecipient!: boolean;

  @Column()
  public isSender!: boolean;

  @Column()
  public txRefNo!: number;

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

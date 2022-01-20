import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { CorePaymentTx } from '../../core_tx';
import { accountIdTransformer, bigintTransformer, ethAddressTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'paymentTx' })
@Index(['txHash', 'userId'], { unique: true })
export class PaymentTxDao implements CorePaymentTx {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

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

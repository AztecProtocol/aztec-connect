import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { AfterInsert, AfterLoad, AfterUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { aliasHashTransformer, grumpkinAddressTransformer, txIdTransformer } from './transformer';

@Entity({ name: 'accountTx' })
export class AccountTxDao {
  @PrimaryColumn('blob', { transformer: [txIdTransformer] })
  public txId!: TxId;

  @Index({ unique: false })
  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public userId!: GrumpkinAddress;

  @Column('blob', { nullable: true, transformer: [aliasHashTransformer] })
  public aliasHash!: AliasHash;

  @Column({ nullable: true })
  public newSpendingPublicKey1?: Buffer;

  @Column({ nullable: true })
  public newSpendingPublicKey2?: Buffer;

  @Column()
  public migrated!: boolean;

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

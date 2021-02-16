import { TxHash } from 'barretenberg/tx_hash';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountId, AliasHash } from '../../user';
import { UserAccountTx } from '../../user_tx';
import { accountIdTransformer, aliasHashTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'accountTx' })
export class AccountTxDao implements UserAccountTx {
  @PrimaryColumn('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @Index({ unique: false })
  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column('blob', { nullable: true, transformer: [aliasHashTransformer] })
  public aliasHash!: AliasHash;

  @Column({ nullable: true })
  public newSigningPubKey1?: Buffer;

  @Column({ nullable: true })
  public newSigningPubKey2?: Buffer;

  @Column()
  public migrated!: boolean;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  public settled?: Date;
}

import { AccountId } from '@aztec/barretenberg/account_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CoreClaimTx } from '../../core_tx';
import { accountIdTransformer, txIdTransformer } from './transformer';

@Entity({ name: 'claimTx' })
export class ClaimTxDao implements CoreClaimTx {
  @PrimaryColumn()
  public nullifier!: Buffer;

  @Column('blob', { transformer: [txIdTransformer] })
  public defiTxId!: TxId;

  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column()
  public secret!: Buffer;

  @Column()
  public interactionNonce!: number;
}

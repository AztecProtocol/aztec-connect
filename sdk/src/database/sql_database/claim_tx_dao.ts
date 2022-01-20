import { AccountId } from '@aztec/barretenberg/account_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CoreClaimTx } from '../../core_tx';
import { accountIdTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'claimTx' })
export class ClaimTxDao implements CoreClaimTx {
  @PrimaryColumn()
  public nullifier!: Buffer;

  @Column('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @Column('blob', { transformer: [accountIdTransformer] })
  public userId!: AccountId;

  @Column()
  public secret!: Buffer;
}

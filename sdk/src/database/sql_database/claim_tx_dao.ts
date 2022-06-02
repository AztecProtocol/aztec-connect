import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TxId } from '@aztec/barretenberg/tx_id';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { CoreClaimTx } from '../../core_tx';
import { grumpkinAddressTransformer, txIdTransformer } from './transformer';

@Entity({ name: 'claimTx' })
export class ClaimTxDao implements CoreClaimTx {
  @PrimaryColumn()
  public nullifier!: Buffer;

  @Column('blob', { transformer: [txIdTransformer] })
  public defiTxId!: TxId;

  @Index({ unique: false })
  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public userId!: GrumpkinAddress;

  @Column()
  public secret!: Buffer;

  @Column()
  public interactionNonce!: number;
}

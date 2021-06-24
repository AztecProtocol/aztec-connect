import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AccountId } from '../../user';
import { Claim } from '../claim';
import { accountIdTransformer, txHashTransformer } from './transformer';

@Entity({ name: 'claim' })
export class ClaimDao implements Claim {
  @PrimaryColumn()
  public nullifier!: Buffer;

  @Column('blob', { transformer: [txHashTransformer] })
  public txHash!: TxHash;

  @Column()
  public secret!: Buffer;

  @Column('blob', { transformer: [accountIdTransformer] })
  public owner!: AccountId;
}

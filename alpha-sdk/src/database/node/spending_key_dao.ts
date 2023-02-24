import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SpendingKey } from '../database.js';
import { grumpkinAddressTransformer } from './transformer.js';

@Entity({ name: 'spendingKey' })
@Index(['key', 'accountPublicKey'], { unique: true })
export class SpendingKeyDao implements SpendingKey {
  constructor(init?: SpendingKey) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;

  @Column()
  public treeIndex!: number;

  @Column()
  public hashPath!: Buffer;
}

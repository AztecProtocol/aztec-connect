import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SpendingKey } from '../database';
import { grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'spendingKey' })
@Index(['key', 'userId'], { unique: true })
export class SpendingKeyDao implements SpendingKey {
  constructor(init?: SpendingKey) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public userId!: GrumpkinAddress;

  @Column()
  public treeIndex!: number;

  @Column()
  public hashPath!: Buffer;
}

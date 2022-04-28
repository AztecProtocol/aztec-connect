import { AccountId } from '@aztec/barretenberg/account_id';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SigningKey } from '../database';
import { accountIdTransformer } from './transformer';

@Entity({ name: 'userKey' })
@Index(['key', 'accountId'], { unique: true })
export class UserKeyDao implements SigningKey {
  constructor(init?: SigningKey) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public accountId!: AccountId;

  @Column()
  public treeIndex!: number;
}

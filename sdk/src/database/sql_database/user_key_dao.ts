import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SigningKey } from '../';
import { AccountId } from '../../user';
import { accountIdTransformer } from './transformer';

@Entity({ name: 'userKey' })
@Index(['key', 'accountId'], { unique: true })
export class UserKeyDao implements SigningKey {
  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public accountId!: AccountId;

  @Column()
  public treeIndex!: number;
}

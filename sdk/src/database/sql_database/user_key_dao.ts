import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SigningKey } from '../';
import { AccountId } from '../../user';
import { accountIdTransformer, grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'userKey' })
@Index(['key', 'accountId'], { unique: true })
export class UserKeyDao implements SigningKey {
  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public accountId!: AccountId;

  @Index({ unique: false })
  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public address!: GrumpkinAddress;

  @Column()
  public treeIndex!: number;
}

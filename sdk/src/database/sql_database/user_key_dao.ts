import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SigningKey } from '../';
import { AccountAliasId } from '../../user';
import { accountAliasIdTransformer, grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'userKey' })
@Index(['key', 'accountAliasId'], { unique: true })
export class UserKeyDao implements SigningKey {
  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn('blob', { transformer: [accountAliasIdTransformer] })
  public accountAliasId!: AccountAliasId;

  @Index({ unique: false })
  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public address!: GrumpkinAddress;

  @Column()
  public treeIndex!: number;
}

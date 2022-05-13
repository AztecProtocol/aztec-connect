import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserData } from '../../user';
import { grumpkinAddressTransformer, accountIdTransformer, aliasHashTransformer } from './transformer';

@Entity({ name: 'userData' })
@Index(['publicKey', 'accountNonce'], { unique: true })
export class UserDataDao implements UserData {
  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public id!: AccountId;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public publicKey!: GrumpkinAddress;

  @Column()
  public privateKey!: Buffer;

  @Column()
  public accountNonce!: number;

  @Column('blob', { nullable: true, transformer: [aliasHashTransformer] })
  public aliasHash?: AliasHash;

  @Column()
  public syncedToRollup!: number;
}

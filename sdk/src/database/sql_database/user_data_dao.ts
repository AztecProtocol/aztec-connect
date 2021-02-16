import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserData, AccountId, AliasHash } from '../../user';
import { grumpkinAddressTransformer, accountIdTransformer, aliasHashTransformer } from './transformer';

@Entity({ name: 'userData' })
@Index(['publicKey', 'nonce'], { unique: true })
export class UserDataDao implements UserData {
  @PrimaryColumn('blob', { transformer: [accountIdTransformer] })
  public id!: AccountId;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public publicKey!: GrumpkinAddress;

  @Column()
  public privateKey!: Buffer;

  @Column()
  public nonce!: number;

  @Column('blob', { nullable: true, transformer: [aliasHashTransformer] })
  public aliasHash?: AliasHash;

  @Column()
  public syncedToRollup!: number;
}

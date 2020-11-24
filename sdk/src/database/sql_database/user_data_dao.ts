import { GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserData, UserId } from '../../user';
import { aliasHashTransformer, grumpkinAddressTransformer, userIdTransformer } from './transformer';

@Entity({ name: 'userData' })
@Index(['publicKey', 'nonce'], { unique: true })
export class UserDataDao implements UserData {
  @PrimaryColumn('blob', { transformer: [userIdTransformer] })
  public id!: UserId;

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

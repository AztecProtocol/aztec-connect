import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserData, AccountId } from '../../user';
import { grumpkinAddressTransformer, accountIdTransformer } from './transformer';

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

  @Column({ nullable: true })
  public alias?: string;

  @Column()
  public syncedToRollup!: number;
}

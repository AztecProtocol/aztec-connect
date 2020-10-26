import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserData } from '../../user';
import { grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'userData' })
export class UserDataDao implements UserData {
  @PrimaryColumn()
  public id!: Buffer;

  @Index({ unique: true })
  @Column()
  public privateKey!: Buffer;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public publicKey!: GrumpkinAddress;

  @Column()
  public syncedToRollup!: number;

  @Column({ nullable: true })
  public alias?: string;
}

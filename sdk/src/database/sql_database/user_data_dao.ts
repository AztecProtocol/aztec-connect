import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { UserData } from '../../user';
import { grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'userData' })
export class UserDataDao implements UserData {
  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public id!: GrumpkinAddress;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;

  @Column()
  public accountPrivateKey!: Buffer;

  @Column()
  public syncedToRollup!: number;
}

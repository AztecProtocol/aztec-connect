import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { UserData } from '../../user/index.js';
import { grumpkinAddressTransformer } from './transformer.js';

@Entity({ name: 'userData' })
export class UserDataDao implements UserData {
  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;

  @Column()
  public accountPrivateKey!: Buffer;

  @Column()
  public syncedToRollup!: number;
}

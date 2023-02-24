import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AccountData } from '../database.js';
import { grumpkinAddressTransformer } from './transformer.js';

@Entity({ name: 'userData' })
export class UserDataDao implements AccountData {
  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;

  @Column()
  public syncedToRollup!: number;
}

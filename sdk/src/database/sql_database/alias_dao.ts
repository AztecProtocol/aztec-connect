import { GrumpkinAddress } from 'barretenberg/address';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'alias' })
export class AliasDao {
  @PrimaryColumn()
  public aliasHash!: Buffer;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public address!: GrumpkinAddress;
}

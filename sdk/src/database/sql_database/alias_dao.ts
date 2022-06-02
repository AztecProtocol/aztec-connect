import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Alias } from '../database';
import { aliasHashTransformer, grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'alias' })
export class AliasDao implements Alias {
  constructor(init?: Alias) {
    Object.assign(this, init);
  }

  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;

  @Index({ unique: false })
  @Column('blob', { transformer: [aliasHashTransformer] })
  public aliasHash!: AliasHash;

  @Column()
  public index!: number;
}

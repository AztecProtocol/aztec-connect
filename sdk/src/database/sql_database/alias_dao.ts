import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AliasHash } from '@aztec/barretenberg/client_proofs/alias_hash';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Alias } from '../database';
import { aliasHashTransformer, grumpkinAddressTransformer } from './transformer';

@Entity({ name: 'alias' })
@Index(['aliasHash', 'address'], { unique: true })
export class AliasDao implements Alias {
  @PrimaryColumn('blob', { transformer: [aliasHashTransformer] })
  public aliasHash!: AliasHash;

  @PrimaryColumn('blob', { transformer: [grumpkinAddressTransformer] })
  public address!: GrumpkinAddress;

  @Index({ unique: false })
  @Column()
  public latestNonce!: number;
}

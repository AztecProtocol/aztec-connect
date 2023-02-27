import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AfterLoad, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Alias } from '../database.js';
import { aliasHashTransformer, grumpkinAddressTransformer } from './transformer.js';

@Entity({ name: 'alias' })
export class AliasDao implements Alias {
  constructor(init?: Alias) {
    Object.assign(this, init);
  }

  @PrimaryColumn('blob', { transformer: [aliasHashTransformer] })
  public aliasHash!: AliasHash;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  @Index()
  public accountPublicKey!: GrumpkinAddress;

  @Column()
  public index!: number;

  @Column({ nullable: true })
  public noteCommitment1?: Buffer;

  @Column({ nullable: true })
  public spendingPublicKeyX?: Buffer;

  @AfterLoad()
  afterLoad() {
    if (this.noteCommitment1 === null) {
      delete this.noteCommitment1;
    }
    if (this.spendingPublicKeyX === null) {
      delete this.spendingPublicKeyX;
    }
  }
}

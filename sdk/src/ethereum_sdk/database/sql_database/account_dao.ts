import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { grumpkinAddressTransformer } from '../../../database/sql_database/transformer';
import { DbAccount } from '../database';
import { ethAddressTransformer } from './transformer';

@Entity({ name: 'account' })
export class AccountDao implements DbAccount {
  @PrimaryColumn('blob', { transformer: [ethAddressTransformer] })
  public ethAddress!: EthAddress;

  @Column('blob', { transformer: [grumpkinAddressTransformer] })
  public accountPublicKey!: GrumpkinAddress;
}

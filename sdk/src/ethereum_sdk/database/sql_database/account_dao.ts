import { EthAddress } from 'barretenberg/address';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DbAccount } from '../database';
import { ethAddressTransformer } from './transformer';

@Entity({ name: 'account' })
export class AccountDao implements DbAccount {
  @PrimaryColumn('blob', { transformer: [ethAddressTransformer] })
  public ethAddress!: EthAddress;

  @Index({ unique: true })
  @Column()
  public userId!: Buffer;
}

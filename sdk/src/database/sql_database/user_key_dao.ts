import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SigningKey } from '../';

@Entity({ name: 'userKey' })
@Index(['key', 'owner'], { unique: true })
export class UserKeyDao implements SigningKey {
  @PrimaryColumn()
  public key!: Buffer;

  @PrimaryColumn()
  public owner!: Buffer;

  @Column()
  public treeIndex!: number;
}

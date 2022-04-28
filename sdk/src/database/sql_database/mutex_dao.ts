import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mutex' })
export class MutexDao {
  @PrimaryColumn()
  public name!: string;

  @Index({ unique: false })
  @Column()
  public expiredAt!: number;
}

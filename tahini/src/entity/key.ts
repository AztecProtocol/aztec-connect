import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'Key' })
@Unique(['id'])
export class Key {
  @PrimaryColumn()
  public id!: string;

  @Column()
  public informationKey!: string;
}

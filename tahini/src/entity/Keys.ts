import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'Keys' })
@Unique(["id"])
export class Keys {
  @PrimaryColumn()
  public id!: string;

  @Column("simple-array")
  public informationKeys!: string[];
}
import { PrimaryColumn, Column, Entity, Unique } from 'typeorm';

@Entity({ name: 'Signature' })
@Unique(["message"])
export class Signature {
  @PrimaryColumn()
  public message!: string;
}
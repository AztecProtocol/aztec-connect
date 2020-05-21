import { Column, Entity, PrimaryColumn, Unique, OneToMany, JoinColumn } from 'typeorm';
import { Note } from './note';

@Entity({ name: 'Key' })
@Unique(['id'])
export class Key {
  // userID e.g. ethereum address
  @PrimaryColumn()
  public id!: string;

  // informationKey of the user
  @Column()
  public informationKeys!: string;

  @Column("simple-array", { nullable: true })
  @OneToMany(type => Note, note => note.owner)
  public notes!: Note[];
}

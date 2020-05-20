import { Column, Entity, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';
import { Notes } from './Notes';

@Entity({ name: 'Note' })
export class Note {
  @PrimaryColumn()
  public owner!: string;

  @Column()
  public viewingKey!: string;

  @ManyToOne(type => Notes, inverseType => inverseType.notes) 
  public entryId!: number
}

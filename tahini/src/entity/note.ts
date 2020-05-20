import { Column, Entity, PrimaryColumn, ManyToOne } from 'typeorm';
import { DataEntry } from './DataEntry';

@Entity({ name: 'Note' })
export class Note {
  @PrimaryColumn()
  public owner!: string;

  @Column()
  public viewingKey!: string;
  
  @Column()
  public informationKey!: string;

  @ManyToOne(type => DataEntry, dataEntry => dataEntry.notes) 
  public entryId!: number
}

import { Connection } from 'typeorm';
import { DataEntry } from '../entity/DataEntry';
import { BaseDb } from './Base';

export class NotesDb extends BaseDb {
  constructor(connection: Connection, note: DataEntry) {
    super(connection, note);
  }

  public async addNote(inputNotes: DataEntry) {
    const dataEntry: any = new DataEntry();
    dataEntry.id = inputNotes.id
    dataEntry.notes = inputNotes.notes;    
    await super.rep.save(dataEntry);
  }
}

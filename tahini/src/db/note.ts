import { Connection, Repository } from 'typeorm';
import { Note } from '../entity/note';
import { BaseDb } from './Base';

export class NoteDb extends BaseDb {

    constructor(connection: Connection) {
        super(connection, Note);
    }

    public async findByNoteData(note: Buffer) {
        return this.rep.find({ where: { note }})
    }

    public async findByOwnerId(id: string) {
        return this.rep.find({ where: { owner: id }})
    }

    public async saveNotes(notes: any[]) {
        return this.rep.save(notes);
    }
}

import { Connection, Repository } from 'typeorm';

export class BaseDb {
    protected rep!: Repository<any>;
    private connection!: Connection;
    private entity!: any;

    constructor(connection: Connection, entity: any) {
        this.entity = entity;
        this.connection = connection;
    }

    public async init() {
        this.rep = this.connection.getRepository(this.entity);
    }
}

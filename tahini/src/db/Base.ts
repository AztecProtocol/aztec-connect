import { Connection, Repository } from 'typeorm';

export class BaseDb {
  protected rep!: Repository<any>;

  constructor(private connection: Connection, private entity: any) {}

  public async init() {
    this.rep = this.connection.getRepository(this.entity);
  }
}

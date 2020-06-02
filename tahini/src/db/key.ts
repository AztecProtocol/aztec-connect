import { Connection } from 'typeorm';
import { Key } from '../entity/key';
import { BaseDb } from './Base';

export class KeyDb extends BaseDb {
    constructor(connection: Connection) {
        super(connection, Key);
    }

    public async findById(id: string) {
        return this.rep.findOne({ where: { id } });
    }

    public async fetchAllInformationKeys() {
        return (await this.rep.createQueryBuilder("Key")
            .select(['Key.informationKey'])
            .getMany())
            .map(key => key.informationKey);
    }

    private async saveKey(id: string, informationKey: string) {
        const key: any = new Key();
        key.id = id;
        key.informationKey = informationKey;

        return this.rep.save(key);
    }

    public async addKey(id: string, informationKey: string) {
        const existingKey = await this.findById(id);
        if (existingKey) {
            return undefined;
        }

        return this.saveKey(id, informationKey);
    }

    public async updateKey(id: string, newInformationKey: string) {
        return this.saveKey(id, newInformationKey);
    }
}

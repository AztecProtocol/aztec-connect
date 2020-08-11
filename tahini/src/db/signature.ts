import { Connection, Repository } from 'typeorm';
import { Signature } from '../entity/signature';
import { BaseDb } from './Base';

export class SignatureDb extends BaseDb {

    constructor(connection: Connection) {
        super(connection, Signature);
    }

    public async findSignatureByMessage(message: string) {
        return this.rep.findOne({ where: { message } });
    }

    public async saveSignature(message: string) {
        const existingSig = await this.findSignatureByMessage(message);
        if (existingSig) {
            return undefined;
        }

        const signature = new Signature();
        signature.message = message;
        return this.rep.save(<any>signature);
    }
}

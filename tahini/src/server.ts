import { Connection, createConnection } from 'typeorm';

export default class Server {
    public connection!: Connection;

    async start () {
        this.connection = await createConnection();
    }

    async stop () {
        await this.connection.close();
    }
}


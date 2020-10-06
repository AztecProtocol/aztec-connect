import { Connection, createConnection } from 'typeorm';
import { SQLDatabase, getOrmConfig } from '../sql_database';
import { databaseTestSuite } from './test_suite';

let connection: Connection;
let db: SQLDatabase;

const createDb = async () => {
  const config = getOrmConfig(':memory:');
  connection = await createConnection(config);
  db = new SQLDatabase(connection);
  return db;
};

const destroyDb = async () => {
  await db.clear();
  await connection.close();
};

databaseTestSuite('SQLDatabase', createDb, destroyDb);

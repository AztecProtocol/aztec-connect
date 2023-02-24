import { DataSource } from 'typeorm';
import { SQLDatabase, getOrmConfig } from '../node/index.js';
import { databaseTestSuite } from './test_suite.js';

let connection: DataSource;
let db: SQLDatabase;

const createDb = async () => {
  const config = getOrmConfig(true);
  connection = new DataSource(config);
  await connection.initialize();
  db = new SQLDatabase(connection);
  return db;
};

const destroyDb = async () => {
  await db.clear();
  await connection.close();
};

databaseTestSuite('SQLDatabase', createDb, destroyDb);

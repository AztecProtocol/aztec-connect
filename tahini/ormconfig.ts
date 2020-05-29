import { BlockDao } from './src/entity/block';
import { Key } from './src/entity/key';
import { Note } from './src/entity/note';

export const ormConfig: any = {
  type: 'sqlite',
  database: 'db.sqlite',
  synchronize: true,
  logging: false,
  entities: [Key, Note, BlockDao],
};

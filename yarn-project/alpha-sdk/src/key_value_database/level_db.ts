import isNode from 'detect-node';
import { mkdirSync } from 'fs';
import { default as levelup, LevelUp } from 'levelup';
import { default as memdown } from 'memdown';
import { levelUpNodeFactory } from './node/index.js';
import { levelUpWebFactory } from './browser/index.js';

export function getLevelDb(name: string, memoryDb = false, identifier?: string): LevelUp {
  if (isNode) {
    const folder = identifier ? `/${identifier}` : '';
    const dbPath = `./data${folder}`;
    if (memoryDb) {
      return levelup(memdown());
    } else {
      mkdirSync(dbPath, { recursive: true });
      return levelUpNodeFactory(`${dbPath}/${name}.db`);
    }
  } else {
    return levelUpWebFactory(name);
  }
}

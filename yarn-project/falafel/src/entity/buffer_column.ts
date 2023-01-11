import { configurator } from '../configurator.js';

const db = configurator.getDbType();

export function bufferColumn(opts: any = {}): [any, any] {
  switch (db) {
    case 'mysql':
      if (opts.length) {
        return ['binary', opts];
      } else {
        return ['blob', opts];
      }
    case 'postgres':
      return ['bytea', { ...opts, length: undefined }];
    case 'sqlite':
      return ['blob', { ...opts, length: undefined }];
  }
}

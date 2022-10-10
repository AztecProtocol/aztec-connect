export type SupportedDb = 'mysql' | 'postgres' | 'sqlite';

// Default to sqlite.
let db: SupportedDb = 'sqlite';

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

/**
 * Before we import any of the db entities (which can be imported by any other file), we need to flag which database
 * we're using so the correct column types will be used. TypeORM seemingly decided projects would only ever want to
 * interact with one type of database, so we have to do this awkward stuff with Buffer types...
 */
export function initEntities(dbUrl?: string) {
  if (dbUrl) {
    const url = new URL(dbUrl);
    db = url.protocol.slice(0, -1) as SupportedDb;
  }
}

import { Mutex } from '.';
import { sleep } from '../sleep';
import { MutexDatabase } from './mutex_database';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('mutex', () => {
  let db: Mockify<MutexDatabase>;
  let mutex: Mutex;
  const mutexName = 'test-mutex';
  const timeout = 500;
  const tryLockInterval = 100;
  const pingInterval = 200;

  beforeEach(() => {
    db = {
      acquireLock: jest.fn().mockResolvedValue(false),
      extendLock: jest.fn().mockImplementation(() => {
        db.acquireLock.mockResolvedValueOnce(false);
      }),
      releaseLock: jest.fn().mockImplementation(() => {
        db.acquireLock.mockResolvedValueOnce(true);
      }),
    };
    db.acquireLock.mockResolvedValueOnce(true);

    mutex = new Mutex(db, mutexName, timeout, tryLockInterval, pingInterval);
  });

  it('cannot lock if locked', async () => {
    const result: string[] = [];
    const fn1 = async (runAfterLocked: () => Promise<void>) => {
      await mutex.lock();
      const pm = runAfterLocked();
      await sleep(500);
      result.push('fn1');
      await mutex.unlock();
      return pm;
    };

    const fn2 = async () => {
      await mutex.lock();
      result.push('fn2');
      await mutex.unlock();
    };

    await fn1(fn2);
    expect(result).toEqual(['fn1', 'fn2']);
  });

  it('automatically extend the expiry time of the lock', async () => {
    await mutex.lock();
    await sleep(1000);
    await mutex.unlock();

    expect(db.extendLock).toHaveBeenCalledWith(mutexName, timeout);
  });
});

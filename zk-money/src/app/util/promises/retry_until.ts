import { delay } from './delay';

/**
 *
 * @param fn The functions that is called at intervals until it returns true
 * @param timeout Timeout in ms
 * @param interval Retry interval in ms
 * @returns True if `fn` eventually returned true, or false if timeout reached
 */
export async function retryUntil(fn: () => Promise<boolean>, timeout: number, interval: number): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const suceeded = await fn();
    if (suceeded) return true;
    await delay(interval);
  }
  return false;
}

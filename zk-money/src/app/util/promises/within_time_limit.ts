import { delay } from './delay';

/**
 * Returns true if the `promise` argument resolves within the specified number
 * of milliseconds. Otherwise returns false.
 */
export async function withinTimeLimit(promise: Promise<unknown>, ms: number) {
  return Promise.race([promise.then(() => true), delay(ms).then(() => false)]);
}

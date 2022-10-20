import { sdkVersion } from '../../core_sdk/index.js';

/**
 * Loads the shared worker. The banana sdk calls this as part of it's factory function.
 */
export function createSharedWorker() {
  if (typeof window.SharedWorker === 'undefined') {
    throw new Error('SharedWorker is not supported.');
  }

  const src = `./sw${sdkVersion ? `.${sdkVersion}` : ''}.js`;
  const name = `Aztec core sdk${sdkVersion ? ` ${sdkVersion}` : ''}`;
  return new SharedWorker(src, { name, credentials: 'same-origin' });
}

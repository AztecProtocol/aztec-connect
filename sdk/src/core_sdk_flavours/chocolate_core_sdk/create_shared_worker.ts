/**
 * Loads the shared worker. The banana sdk calls this as part of it's factory function.
 */
export async function createSharedWorker() {
  if (typeof window.SharedWorker === 'undefined') {
    throw new Error('SharedWorker is not supported.');
  }

  const version = (process.env.NODE_ENV === 'production' && process.env.COMMIT_TAG) || '';
  const src = `./shared_worker${version ? `.${version}` : ''}.js`;
  const name = `Aztec core sdk${version ? ` ${version}` : ''}`;
  return new SharedWorker(src, { name, credentials: 'same-origin' });
}

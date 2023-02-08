import { RollupProvider } from '../index.js';
import { VERSION_HASH } from '../package_version.js';

export async function sendClientLog(rollupProvider: RollupProvider, data: any, debug?: (...args: any[]) => void) {
  await rollupProvider
    .clientLog({
      ...data,
      sdkVersion: VERSION_HASH,
    })
    .catch(e => debug && debug('client log failed:', e));
}

export async function sendClientConsoleLog(rollupProvider: RollupProvider, data: any) {
  await rollupProvider.clientConsoleLog({
    ...data,
    sdkVersion: VERSION_HASH,
  });
}

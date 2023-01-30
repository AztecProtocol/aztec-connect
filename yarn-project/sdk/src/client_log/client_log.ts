import { RollupProvider } from '../index.js';
import { VERSION_HASH } from '../package_version.js';

export async function sendClientLog(rollupProvider: RollupProvider, data: any) {
  await rollupProvider.clientLog({
    ...data,
    sdkVersion: VERSION_HASH,
  });
}

export async function sendClientConsoleLog(rollupProvider: RollupProvider, data: any) {
  await rollupProvider.clientConsoleLog({
    ...data,
    sdkVersion: VERSION_HASH,
  });
}

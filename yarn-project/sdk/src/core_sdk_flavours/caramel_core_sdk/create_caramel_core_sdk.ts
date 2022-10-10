import { default as levelup, LevelUp } from 'levelup';
import { CoreSdkServerStub } from '../../core_sdk/index.js';
import { createBananaCoreSdk } from '../banana_core_sdk/index.js';
import { createVanillaCoreSdk } from '../vanilla_core_sdk/index.js';
import { CaramelCoreSdk } from './caramel_core_sdk.js';
import { CaramelCoreSdkOptions } from './caramel_core_sdk_options.js';
import { createDebugLogger } from '@aztec/barretenberg/log';

const debug = createDebugLogger('bb:create_caramel_core_sdk');

function getLevelDb(): LevelUp {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return levelup(require('level-js')(`aztec2-sdk-auth`));
}

export async function createCaramelCoreSdk(origin: string, options: CaramelCoreSdkOptions) {
  debug('creating origin permissioned backend...');
  const coreSdk =
    typeof window.SharedWorker !== 'undefined'
      ? await createBananaCoreSdk(options)
      : await createVanillaCoreSdk(options);
  const db = getLevelDb();
  return new CaramelCoreSdk(new CoreSdkServerStub(coreSdk), origin, db);
}

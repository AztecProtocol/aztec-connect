import levelup, { LevelUp } from 'levelup';
import { CoreSdkServerStub } from '../../core_sdk';
import { createBananaCoreSdk } from '../banana_core_sdk';
import { createVanillaCoreSdk } from '../vanilla_core_sdk';
import { CaramelCoreSdk } from './caramel_core_sdk';
import { CaramelCoreSdkOptions } from './caramel_core_sdk_options';
import { createLogger } from '@aztec/barretenberg/debug';

const debug = createLogger('bb:create_caramel_core_sdk');

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

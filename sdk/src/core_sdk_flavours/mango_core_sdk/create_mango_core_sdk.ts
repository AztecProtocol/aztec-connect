import levelup, { LevelUp } from 'levelup';
import { CoreSdkServerStub } from '../../core_sdk';
import { createBananaCoreSdk } from '../banana_core_sdk';
import { createVanillaCoreSdk } from '../vanilla_core_sdk';
import { MangoCoreSdk } from './mango_core_sdk';
import { MangoCoreSdkOptions } from './mango_core_sdk_options';

function getLevelDb(): LevelUp {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return levelup(require('level-js')(`aztec2-sdk-auth`));
}

export async function createMangoCoreSdk(origin: string, options: MangoCoreSdkOptions) {
  const coreSdk =
    typeof window.SharedWorker !== 'undefined'
      ? await createBananaCoreSdk(options)
      : await createVanillaCoreSdk(options);
  const db = getLevelDb();
  return new MangoCoreSdk(new CoreSdkServerStub(coreSdk), origin, db);
}

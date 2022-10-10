import { CoreSdkOptions } from '../../core_sdk/index.js';

export interface ChocolateCoreSdkOptions extends CoreSdkOptions {
  pollInterval?: number;
}

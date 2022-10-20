import { CoreSdkOptions } from '../../core_sdk/index.js';

export interface CaramelCoreSdkOptions extends CoreSdkOptions {
  pollInterval?: number;
}

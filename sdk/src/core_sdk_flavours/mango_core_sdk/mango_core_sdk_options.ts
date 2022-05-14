import { CoreSdkOptions } from '../../core_sdk';

export interface MangoCoreSdkOptions extends CoreSdkOptions {
  pollInterval?: number;
}

import { CoreSdkServerStub } from './core_sdk_server_stub.js';

export type CoreSdkSerializedInterface = {
  [K in keyof CoreSdkServerStub]: CoreSdkServerStub[K];
};

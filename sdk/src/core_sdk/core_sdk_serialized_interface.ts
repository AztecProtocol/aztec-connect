import { CoreSdkServerStub } from './core_sdk_server_stub';

export type CoreSdkSerializedInterface = {
  [K in keyof CoreSdkServerStub]: CoreSdkServerStub[K];
};

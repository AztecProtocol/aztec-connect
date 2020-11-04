export enum ProviderError {
  USER_REJECTED = 4001,
  UNAUTHORIZED = 4100,
  UNSUPPORTED = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
}

export interface ProviderMessage {
  readonly type: string;
  readonly data: unknown;
}

export interface RequestArguments {
  readonly method: string;
  readonly params?: any[];
}

export interface ProviderRpcError extends Error {
  message: string;
  code: ProviderError | number;
  data?: unknown;
}

export interface ProviderConnectInfo {
  readonly chainId: string;
}

export type EthereumProviderNotifications = 'connect' | 'disconnect' | 'chainChanged' | 'accountsChanged' | 'message';

export interface EthereumProvider {
  request(args: RequestArguments): Promise<any>;

  on(notification: 'connect', listener: (connectInfo: ProviderConnectInfo) => void): this;
  on(notification: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  on(notification: 'chainChanged', listener: (chainId: string) => void): this;
  on(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  on(notification: 'message', listener: (message: ProviderMessage) => void): this;

  removeListener(notification: 'connect', listener: (connectInfo: ProviderConnectInfo) => void): this;
  removeListener(notification: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  removeListener(notification: 'chainChanged', listener: (chainId: string) => void): this;
  removeListener(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  removeListener(notification: 'message', listener: (message: ProviderMessage) => void): this;
}

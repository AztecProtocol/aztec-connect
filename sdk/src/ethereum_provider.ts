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
  readonly params?: readonly unknown[] | object;
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
  request(args: RequestArguments): Promise<unknown>;

  on(notification: 'connect', listener: (connectInfo: ProviderConnectInfo) => void): this;
  on(notification: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  on(notification: 'chainChanged', listener: (chainId: string) => void): this;
  on(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
  on(notification: 'message', listener: (message: ProviderMessage) => void): this;

  off(notification: string, listener: Function): this;

  removeListener(notification: 'notification', listener: (result: any) => void): this;
  removeListener(notification: 'connect', listener: () => void): this;
  removeListener(notification: 'close', listener: (code: number, reason: string) => void): this;
  removeListener(notification: 'networkChanged', listener: (networkId: string) => void): this;
  removeListener(notification: 'accountsChanged', listener: (accounts: string[]) => void): this;
}

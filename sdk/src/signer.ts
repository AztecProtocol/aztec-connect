import { Provider, TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';

export interface Signer {
  provider?: Provider;
  getAddress(): Promise<string>;
  signMessage(message: string | Buffer): Promise<string>;
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>;
}

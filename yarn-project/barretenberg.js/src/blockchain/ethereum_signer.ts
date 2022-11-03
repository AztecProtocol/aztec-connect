import { EthAddress } from '../address/index.js';
import { TypedData } from './typed_data.js';

export type EthereumSignature = { v: Buffer; r: Buffer; s: Buffer };

export interface EthereumSigner {
  signPersonalMessage(message: Buffer, address: EthAddress): Promise<Buffer>;
  signMessage(message: Buffer, address: EthAddress): Promise<Buffer>;
  signTypedData({ domain, types, message }: TypedData, address: EthAddress): Promise<EthereumSignature>;
  validateSignature(publicOwner: EthAddress, signature: Buffer, data: Buffer): boolean;
}

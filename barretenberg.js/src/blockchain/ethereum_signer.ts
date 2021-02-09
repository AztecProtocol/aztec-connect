import { EthAddress } from '../address';
import { TypedData } from './typed_data';

export type EthereumSignature = { v: Buffer; r: Buffer; s: Buffer };

export interface EthereumSigner {
  signMessage(message: Buffer, address: EthAddress): Promise<Buffer>;
  signTypedData({ domain, types, message }: TypedData, address: EthAddress): Promise<EthereumSignature>;
  validateSignature(publicOwner: EthAddress, signature: Buffer, data: Buffer): boolean;
}

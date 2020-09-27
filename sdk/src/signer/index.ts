import { EthAddress } from 'barretenberg/address';
import { Signature } from 'barretenberg/client_proofs/signature';

export * from './schnorr_signer';

export interface Signer {
  signMessage(message: Buffer): Promise<Signature>;
}

export interface EthereumSigner {
  getAddress(): EthAddress;
  signMessage(message: Buffer): Promise<Buffer>;
}

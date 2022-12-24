import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, EthereumSigner, TypedData } from '@aztec/barretenberg/blockchain';
import { validateSignature } from '../validate_signature.js';

export class Web3Signer implements EthereumSigner {
  constructor(private provider: EthereumProvider) {}

  public async signPersonalMessage(message: Buffer, address: EthAddress) {
    const toSign = '0x' + message.toString('hex');
    const result = await this.provider.request({ method: 'personal_sign', params: [toSign, address.toString()] });
    return this.normaliseSignature(Buffer.from(result.slice(2), 'hex'));
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    const toSign = '0x' + message.toString('hex');
    const result = await this.provider.request({ method: 'eth_sign', params: [address.toString(), toSign] });
    return this.normaliseSignature(Buffer.from(result.slice(2), 'hex'));
  }

  public async signTypedData(data: TypedData, address: EthAddress) {
    const result = await this.provider.request({
      method: 'eth_signTypedData_v4',
      params: [address.toString(), JSON.stringify(data)],
    });
    const signature = this.normaliseSignature(Buffer.from(result.slice(2), 'hex'));
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[signature.length - 1];
    return { v: Buffer.from([v]), r, s };
  }

  // Older software returns 00 or 01 as v. Need to adjust to make v 27 or 28.
  private normaliseSignature(signature: Buffer) {
    const v = signature[signature.length - 1];
    if (v <= 1) {
      return Buffer.concat([signature.subarray(0, -1), Buffer.from([v + 27])]);
    }
    return signature;
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }
}

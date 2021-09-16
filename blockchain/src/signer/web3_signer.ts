import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { EthereumSignature, EthereumSigner, TypedData } from 'barretenberg/blockchain';
import { utils } from 'ethers';
import { validateSignature } from '../validate_signature';

export class Web3Signer implements EthereumSigner {
  constructor(private provider: Web3Provider) {}

  public async signPersonalMessage(message: Buffer, address: EthAddress) {
    const toSign = utils.hexlify(utils.toUtf8Bytes(message.toString()));
    const result = await this.provider.send('personal_sign', [toSign, address.toString()]);
    return Buffer.from(result.slice(2), 'hex');
  }

  public async signMessage(message: Buffer, address: EthAddress) {
    const signer = this.provider.getSigner(address.toString());
    const sig = await signer.signMessage(message);
    const signature = Buffer.from(sig.slice(2), 'hex');

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      return Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }

  public async signTypedData({ domain, types, message }: TypedData, address: EthAddress) {
    const signer = this.provider.getSigner(address.toString());
    const result = await signer._signTypedData(domain, types, message);
    const signature = Buffer.from(result.slice(2), 'hex');
    const r = signature.slice(0, 32);
    const s = signature.slice(32, 64);
    const v = signature.slice(64, 65);
    const sig: EthereumSignature = { v, r, s };
    return sig;
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }
}

import { Signer } from 'aztec2-sdk';

export class MetamaskSigner implements Signer {
  constructor(private account: string) {}

  getAddress() {
    return Buffer.from(this.account.slice(2), 'hex');
  }

  async signMessage(data: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      window.web3.personal.sign(`0x${data.toString('hex')}`, this.account, (err: Error, result: string) =>
        err ? reject(err) : resolve(Buffer.from(result.slice(2), 'hex')),
      );
    });
  }
}

export interface Signer {
  getAddress(): Promise<string>;
  signMessage(message: string | Buffer): Promise<string>;
}

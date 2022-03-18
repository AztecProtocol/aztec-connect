import {
  deserializeBufferFromVector,
  serializeBufferToVector,
} from '@aztec/barretenberg/serialize';

export class RootVerifier {
  constructor(
    public rootRollupProofBuf: Buffer,
  ) { }

  public toBuffer() {
    return Buffer.concat([
      serializeBufferToVector(this.rootRollupProofBuf)
    ]);
  }

  public static fromBuffer(buf: Buffer) {
    const rootRollupProofBuf = deserializeBufferFromVector(buf);
    return new RootVerifier(rootRollupProofBuf.elem);
  }
}

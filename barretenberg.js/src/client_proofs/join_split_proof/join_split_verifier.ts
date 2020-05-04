import { BarretenbergWorker } from '../../wasm/worker';
import { SinglePippenger } from '../../pippenger';

export class JoinSplitVerifier {
  private wasm: BarretenbergWorker;

  constructor(private pippenger: SinglePippenger) {
    this.wasm = pippenger.getWorker();
  }

  public async init(g2Data: Uint8Array) {
    await this.wasm.transferToHeap(g2Data, 0);
    await this.wasm.call('join_split__init_verification_key', this.pippenger.getPointer(), 0);
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.wasm.call('bbmalloc', proof.length);
    await this.wasm.transferToHeap(proof, proofPtr);
    const verified = (await this.wasm.call('join_split__verify_proof', proofPtr, proof.length)) ? true : false;
    await this.wasm.call('bbfree', proofPtr);
    return verified;
  }
}

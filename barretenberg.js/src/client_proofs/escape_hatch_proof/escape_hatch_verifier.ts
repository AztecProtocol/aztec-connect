import { BarretenbergWorker } from '../../wasm/worker';
import { SinglePippenger } from '../../pippenger';
export class EscapeHatchVerifier {
  private worker!: BarretenbergWorker;

  public async computeKey(pippenger: SinglePippenger, g2Data: Uint8Array) {
    this.worker = pippenger.getWorker();
    await this.worker.transferToHeap(g2Data, 0);
    await this.worker.call('escape_hatch__init_verification_key', pippenger.getPointer(), 0);
  }

  public async verifyProof(proof: Buffer) {
    const proofPtr = await this.worker.call('bbmalloc', proof.length);
    await this.worker.transferToHeap(proof, proofPtr);
    const verified = (await this.worker.call('escape_hatch__verify_proof', proofPtr, proof.length)) ? true : false;
    await this.worker.call('bbfree', proofPtr);
    return verified;
  }
}

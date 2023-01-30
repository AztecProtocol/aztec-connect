import { BarretenbergWasm, BarretenbergWorker } from '../../wasm/index.js';
import { JoinSplitTx } from './join_split_tx.js';

export async function createJoinSplitProofSigningData(tx: JoinSplitTx, wasm: BarretenbergWorker | BarretenbergWasm) {
  await wasm.transferToHeap(tx.toBuffer(), 0);
  await wasm.call('join_split__compute_signing_data', 0, 0);
  return Buffer.from(await wasm.sliceMemory(0, 32));
}

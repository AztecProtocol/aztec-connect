import { BarretenbergWasm, BarretenbergWorker } from '../../wasm/index.js';
import { AccountTx } from './account_tx.js';

export async function createAccountProofSigningData(tx: AccountTx, wasm: BarretenbergWorker | BarretenbergWasm) {
  await wasm.transferToHeap(tx.toBuffer(), 0);
  await wasm.call('account__compute_signing_data', 0, 0);
  return Buffer.from(await wasm.sliceMemory(0, 32));
}

import { readFileSync } from 'fs';

export async function getRollupData() {
  const rawData = await readFileSync('./test/fixtures/rollup_proof_data.dat');
  // [4 bytes proof length][proof data][1 byte verification success]
  return rawData.slice(4, -1);
}

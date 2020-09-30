import { readFileAsync } from 'barretenberg/fs_async';

export async function getRollupData() {
  const rawData = await readFileAsync('./test/fixtures/rollup_proof_data.dat');
  // [1 byte startup success][4 bytes proof length][proof data][1 byte verification success]
  return rawData.slice(5, -1);
}

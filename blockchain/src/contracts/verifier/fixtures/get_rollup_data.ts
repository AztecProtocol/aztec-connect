import { readFileSync } from 'fs';

export async function getRollupData(innerSize: number, outerSize: number) {
  const rawData = await readFileSync(
    `./src/contracts/verifier/fixtures/rollup_proof_data_${innerSize}x${outerSize}.dat`,
  );
  // [4 bytes proof length][proof data][1 byte verification success]
  return rawData.slice(4, -1);
}

import { readFileSync } from 'fs';

export async function getStandardPlonkData() {
  const rawData = await readFileSync(`./src/contracts/verifier/fixtures/standard_proof_data.dat`);// ${innerSize}x${outerSize}.dat`);
  // [4 bytes proof length][proof data][1 byte verification success]
  return rawData.slice(4, -1);
}

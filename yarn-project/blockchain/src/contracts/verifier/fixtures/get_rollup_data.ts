import { readFileSync } from 'fs';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';

export function getRollupData(innerSize: number, outerSize: number) {
  const rawData = readFileSync(
    `./src/contracts/verifier/fixtures/mock_rollup_proof_data_${innerSize}x${outerSize}.dat`,
  );
  // [4 bytes data length][data][1 byte verification success]
  const data = rawData.slice(4, -1);
  const broadcastData = RollupProofData.fromBuffer(data);
  const proofData = data.slice(broadcastData.toBuffer().length);
  const inputHash = proofData.slice(0, 32);
  return { proofData, broadcastData, inputHash };
}

import { readFileSync, writeFileSync } from 'fs';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';

function main() {
  writeEncodedData('mock_rollup_proof_data_3x2.dat');
  writeEncodedData('rollup_proof_data_1x1.dat');
}

function writeEncodedData(path: string) {
  const rawData = readFileSync(path);
  // [4 bytes data length][data][1 byte verification success]
  const data = rawData.slice(4, -1);
  const broadcastData = RollupProofData.fromBuffer(data);
  const proofData = data.slice(broadcastData.toBuffer().length);
  const proofBytes = Buffer.concat([broadcastData.encode(), proofData]);

  writeFileSync(`encoded_${path}`, proofBytes);
}

main();

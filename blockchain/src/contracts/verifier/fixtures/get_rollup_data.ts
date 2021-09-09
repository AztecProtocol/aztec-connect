import { readFileSync } from 'fs';
import { deserializeUInt32 } from '@aztec/barretenberg/serialize';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';

export async function getRollupData(innerSize: number, outerSize: number) {
  const rawData = await readFileSync(`./src/contracts/verifier/fixtures/rollup_proof_data_${innerSize}x${outerSize}.dat`);
  // [4 bytes input data length][input data][4 bytes proof data length][proof data][1 byte verification success]
  const inputDataLength = deserializeUInt32(rawData.slice(0, 4)).elem;
  const inputData = rawData.slice(4, 4 + inputDataLength);

  const proofData = rawData.slice(8 + inputDataLength, -1); // add another 4 to endpoint to move past proof data length
  return { proof: proofData, proofData: RollupProofData.fromBuffer(inputData) };
}

export async function getRollupDataAsHalloumi(innerSize: number, outerSize: number) {
  const rawData = await readFileSync(`./src/contracts/verifier/fixtures/rollup_proof_data_${innerSize}x${outerSize}.dat`);
  // [4 bytes input data length][input data][4 bytes proof data length][proof data][1 byte verification success]
  const inputDataLength = deserializeUInt32(rawData.slice(0, 4)).elem;
  const inputData = rawData.slice(4, 4 + inputDataLength);

  const proofData = rawData.slice(8 + inputDataLength, -1); // add another 4 to endpoint to move past proof data length

  const publicInputData = RollupProofData.fromBuffer(inputData);
  const pubInputHashRaw = proofData.slice(0, 64);
  const pubInputHash = Buffer.concat([pubInputHashRaw.slice(16, 32), pubInputHashRaw.slice(48, 64)]);
  const contractInput = Buffer.concat([publicInputData.encode(), proofData]);
  return { proofBytes: contractInput, pubInputHash };
}

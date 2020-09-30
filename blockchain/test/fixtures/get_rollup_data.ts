import { readFileAsync } from 'barretenberg/fs_async';

export async function getRollupData() {
  const rawData = await readFileAsync('./test/data/rollup_proof_data.dat', { encoding: 'hex' });

  // rollup_cli prepends a 'true' byte to std::cout which is captured, slice off
  const rawDataBuf = Buffer.from(rawData, 'hex').slice(1);
  const header = await rawDataBuf.slice(0, 4);
  const proofLength = header.readUInt32BE(0);
  return rawDataBuf.slice(4, proofLength + 4);
}

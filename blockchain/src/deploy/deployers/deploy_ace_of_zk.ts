import { Contract, Signer } from 'ethers';
import * as AceOfZkBridge from '@aztec/bridge-clients/client-dest/typechain-types/factories/AceOfZkBridge__factory';

const gasLimit = 5000000;

export async function deployAceOfZk(signer: Signer, rollup: Contract) {
  console.error('Deploying AzeOfZK...');
  const aceOfZkBrige = await (await new AceOfZkBridge.AceOfZkBridge__factory(signer).deploy(rollup.address)).deployed();

  await rollup.setSupportedBridge(aceOfZkBrige.address, 300000n, { gasLimit });

  console.error(`AceOfZkBridge contract address: ${aceOfZkBrige.address}.`);
  return aceOfZkBrige;
}

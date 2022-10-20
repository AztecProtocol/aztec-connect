import { Contract, Signer } from 'ethers';
// eslint-disable-next-line camelcase
import { AceOfZkBridge__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/AceOfZkBridge__factory.js';

const gasLimit = 5000000;

export async function deployAceOfZk(signer: Signer, rollup: Contract) {
  console.error('Deploying AzeOfZK...');
  const aceOfZkBrige: any = await (await new AceOfZkBridge__factory(signer).deploy(rollup.address)).deployed();

  await rollup.setSupportedBridge(aceOfZkBrige.address, BigInt(300000), { gasLimit });

  console.error(`AceOfZkBridge contract address: ${aceOfZkBrige.address}.`);
  return aceOfZkBrige;
}

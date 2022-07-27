// eslint-disable-next-line camelcase
import { CompoundBridge__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/CompoundBridge__factory';
import { Contract, Signer } from 'ethers';

const gasLimit = 5000000;

export const deployCompoundBridge = async (owner: Signer, rollup: Contract) => {
  console.error('Deploying CompoundBridge...');
  const bridge = await new CompoundBridge__factory(owner).deploy(rollup.address, {
    gasLimit,
  });
  console.error(`CompoundBridge contract address: ${bridge.address}`);

  await rollup.setSupportedBridge(bridge.address, 100000n, { gasLimit });
  return bridge;
};

import { LidoBridge__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/LidoBridge__factory';
import { Contract, Signer } from 'ethers';

const gasLimit = 5000000;

export const deployLidoBridge = async (
  owner: Signer,
  rollup: Contract,
  referralCode = '0x0000000000000000000000000000000000000000',
) => {
  console.error('Deploying LidoBridge...');
  const bridge = await new LidoBridge__factory(owner).deploy(
    rollup.address,
    referralCode, // TODO set a referral code if we want to get lido tokens
    {
      gasLimit,
    },
  );
  console.error(`LidoBridge contract address: ${bridge.address}`);

  await rollup.setSupportedBridge(bridge.address, 500000n, { gasLimit });
  return bridge;
};

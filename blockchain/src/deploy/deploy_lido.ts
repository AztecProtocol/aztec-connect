import LidoBridge, {
  LidoBridge__factory,
} from '@aztec/bridge-clients/client-dest/typechain-types/factories/LidoBridge__factory';
import { Signer } from 'ethers';

const gasLimit = 5000000;

export const deployLidoBridge = async (
  owner: Signer,
  rollupAddress: string,
  referralCode = '0x0000000000000000000000000000000000000000',
) => {
  console.error('Deploying LidoBridge...');
  const bridge = await new LidoBridge__factory(owner).deploy(
    rollupAddress,
    referralCode, // TODO set a referral code if we want to get lido tokens
    {
      gasLimit,
    },
  );
  console.error(`LidoBridge contract address: ${bridge.address}`);
  return bridge;
};

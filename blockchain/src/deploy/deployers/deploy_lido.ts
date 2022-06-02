// eslint-disable-next-line camelcase
import { LidoBridge__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/LidoBridge__factory';
// eslint-disable-next-line camelcase
import { ILido__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/ILido__factory';
// eslint-disable-next-line camelcase
import { IWstETH__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/IWstETH__factory';
import { Contract, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';

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

  // Will mint initial tokens to the bridge contract to ensure that balance slots are not 0.

  // eslint-disable-next-line camelcase
  const stEth = ILido__factory.connect('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', owner);
  // eslint-disable-next-line camelcase
  const wstEth = IWstETH__factory.connect('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', owner);

  await stEth.submit(EthAddress.ZERO.toString(), { value: 100 });
  await stEth.approve(wstEth.address, 50);
  await wstEth.wrap(50);

  await stEth.transfer(bridge.address, 10);
  await wstEth.transfer(bridge.address, 10);
  await wstEth.transfer(rollup.address, 10);

  await rollup.setSupportedBridge(bridge.address, 175000n, { gasLimit });
  await rollup.setSupportedBridge(bridge.address, 250000n, { gasLimit });
  return bridge;
};

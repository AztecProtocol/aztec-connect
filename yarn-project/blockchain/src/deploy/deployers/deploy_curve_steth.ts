// eslint-disable-next-line camelcase
import { CurveStEthBridge__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/CurveStEthBridge__factory.js';
// eslint-disable-next-line camelcase
import { ILido__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/ILido__factory.js';
// eslint-disable-next-line camelcase
import { IWstETH__factory } from '@aztec/bridge-clients/client-dest/typechain-types/factories/IWstETH__factory.js';
import { Contract, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';

const gasLimit = 5000000;

export const deployCurveBridge = async (owner: Signer, rollup: Contract) => {
  console.error('Deploying curveBridge...');
  // TODO: any here. I can't wrap my head around the total garbage that is ethers and TypeChain. You try...
  const bridge: any = await new CurveStEthBridge__factory(owner).deploy(rollup.address, {
    gasLimit,
  });
  console.error(`CurveBridge contract address: ${bridge.address}`);

  // Will mint initial tokens to the bridge contract to ensure that balance slots are not 0.

  // eslint-disable-next-line camelcase
  const stEth = ILido__factory.connect('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', owner);
  // eslint-disable-next-line camelcase
  const wstEth: any = IWstETH__factory.connect('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', owner);

  await stEth.submit(EthAddress.ZERO.toString(), { value: 100, gasLimit });
  await stEth.approve(wstEth.address, 50, { gasLimit });
  await wstEth.wrap(50, { gasLimit });

  await stEth.transfer(bridge.address, 10, { gasLimit });
  await wstEth.transfer(bridge.address, 10, { gasLimit });
  await wstEth.transfer(rollup.address, 10, { gasLimit });

  await rollup.setSupportedBridge(bridge.address, BigInt(250000), { gasLimit });

  return bridge;
};

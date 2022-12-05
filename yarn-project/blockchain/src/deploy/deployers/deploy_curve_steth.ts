import { CurveStEthBridge, ILido, IWstETH } from '../../abis.js';
import { Contract, ContractFactory, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';

const gasLimit = 5000000;

export const deployCurveBridge = async (owner: Signer, rollup: Contract) => {
  console.log('Deploying curveBridge...');
  const bridgeFactory = new ContractFactory(CurveStEthBridge.abi, CurveStEthBridge.bytecode, owner);
  const bridge: any = await bridgeFactory.deploy(rollup.address, {
    gasLimit,
  });
  console.log(`CurveBridge contract address: ${bridge.address}`);

  // Will mint initial tokens to the bridge contract to ensure that balance slots are not 0.
  const stEthFactory = new ContractFactory(ILido.abi, ILido.bytecode, owner);
  const stEth = stEthFactory.attach('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84');
  const wstEthFactory = new ContractFactory(IWstETH.abi, IWstETH.bytecode, owner);
  const wstEth: any = wstEthFactory.attach('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0');

  await stEth.submit(EthAddress.ZERO.toString(), { value: 100, gasLimit });
  await stEth.approve(wstEth.address, 50, { gasLimit });
  await wstEth.wrap(50, { gasLimit });

  await stEth.transfer(bridge.address, 10, { gasLimit });
  await wstEth.transfer(bridge.address, 10, { gasLimit });
  await wstEth.transfer(rollup.address, 10, { gasLimit });

  await rollup.setSupportedBridge(bridge.address, BigInt(250000), { gasLimit });

  return bridge;
};

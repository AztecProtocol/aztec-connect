import { Contract, ContractFactory, Signer } from 'ethers';
import { DummyDefiBridge } from '../../abis.js';

const gasLimit = 5000000;
const dummyDefiBridgeLibrary = new ContractFactory(DummyDefiBridge.abi, DummyDefiBridge.bytecode);

export async function deployDummyBridge(rollupProcessor: Contract, signer: Signer, assets: Contract[]) {
  console.log('Deploying DummyDefiBridge...');
  const outputValueEth = BigInt(10) ** BigInt(15); // 0.001
  const outputValueToken = BigInt(10) ** BigInt(20); // 100
  const outputVirtualValueA = BigInt('0x123456789abcdef0123456789abcdef0123456789abcdef');
  const outputVirtualValueB = BigInt(10);
  const dummyDefiBridge = await dummyDefiBridgeLibrary
    .connect(signer)
    .deploy(rollupProcessor.address, outputValueEth, outputValueToken, outputVirtualValueA, outputVirtualValueB);
  console.log(`DummyDefiBridge contract address: ${dummyDefiBridge.address}`);

  const topupTokenValue = outputValueToken * BigInt(100);
  for (const asset of assets) {
    await asset.mint(dummyDefiBridge.address, topupTokenValue, { gasLimit });
  }

  await rollupProcessor.setSupportedBridge(dummyDefiBridge.address, BigInt(300000), { gasLimit });

  return dummyDefiBridge;
}

#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import MockDefiBridge from '../../artifacts/contracts/test/DummyDefiBridge.sol/DummyDefiBridge.json';

const gasLimit = 5000000;
const dummyDefiBridgeLibrary = new ContractFactory(MockDefiBridge.abi, MockDefiBridge.bytecode);

export async function deployDummyBridge(rollupProcessor: Contract, signer: Signer, assets: Contract[]) {
  console.error('Deploying DummyDefiBridge...');
  const outputValueEth = 10n ** 15n; // 0.001
  const outputValueToken = 10n ** 20n; // 100
  const outputVirtualValueA = BigInt('0x123456789abcdef0123456789abcdef0123456789abcdef');
  const outputVirtualValueB = 10n;
  const dummyDefiBridge = await dummyDefiBridgeLibrary
    .connect(signer)
    .deploy(rollupProcessor.address, outputValueEth, outputValueToken, outputVirtualValueA, outputVirtualValueB);
  console.error(`DummyDefiBridge contract address: ${dummyDefiBridge.address}`);

  const topupTokenValue = outputValueToken * 100n;
  for (const asset of assets) {
    await asset.mint(dummyDefiBridge.address, topupTokenValue, { gasLimit });
  }

  await rollupProcessor.setSupportedBridge(dummyDefiBridge.address, 300000n, { gasLimit });

  return dummyDefiBridge;
}

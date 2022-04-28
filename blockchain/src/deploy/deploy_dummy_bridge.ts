#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import MockDefiBridge from '../artifacts/contracts/test/DummyDefiBridge.sol/DummyDefiBridge.json';

const dummyDefiBridgeLibrary = new ContractFactory(MockDefiBridge.abi, MockDefiBridge.bytecode);

export async function deployDummyBridge(
  rollupProcessor: Contract,
  signer: Signer,
  outputValueEth: bigint,
  outputValueToken: bigint,
  outputVirtualValueA: bigint,
  outputVirtualValueB: bigint,
) {
  console.error('Deploying DummyDefiBridge...');
  const dummyDefiBridge = await dummyDefiBridgeLibrary
    .connect(signer)
    .deploy(rollupProcessor.address, outputValueEth, outputValueToken, outputVirtualValueA, outputVirtualValueB);
  console.error(`DummyDefiBridge contract address: ${dummyDefiBridge.address}`);
  return dummyDefiBridge;
}

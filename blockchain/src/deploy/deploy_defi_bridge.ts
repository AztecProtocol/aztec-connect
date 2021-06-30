#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import UniswapBridge from '../artifacts/contracts/bridges/UniswapBridge.sol/UniswapBridge.json';

export async function deployDefiBridge(
  signer: Signer,
  rollupProcessor: Contract,
  uniswapRouter: Contract,
  inputAsset: string,
  outputAssetA: string,
  outputAssetB?: string,
) {
  // TODO - Create a bridge contract with two output assets.
  console.error('Deploying DefiBridge...');
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(
    rollupProcessor.address,
    uniswapRouter.address,
    inputAsset,
    outputAssetA,
  );
  console.error(
    `DefiBridge contract address: ${
      defiBridge.address
    }. Input Asset: ${inputAsset}. Output asset A: ${outputAssetA}. Output asset B: ${outputAssetB || '-'}.`,
  );
  return defiBridge;
}

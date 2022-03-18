#!/usr/bin/env node
import { Contract } from 'ethers';

export interface BridgeAssets {
  inputAsset: string;
  outputAssetA: string,
  outputAssetB?: string,
}


export async function deployDefiBridge(
  rollupProcessor: Contract,
  bridgeDeployFunction: () => Promise<Contract>,
  gasLimit: bigint,
  assetsConfigs: BridgeAssets[]
) {
  // TODO - Create a bridge contract with two output assets.
  console.error('Deploying DefiBridge...');
  const bridgeContract: Contract = await bridgeDeployFunction();
  await rollupProcessor.setSupportedBridge(bridgeContract.address, gasLimit);
  for (const assets of assetsConfigs) {    
    console.error(
      `DefiBridge contract address: ${
        bridgeContract.address
      }. Input Asset: ${assets.inputAsset}. Output asset A: ${assets.outputAssetA}. Output asset B: ${assets.outputAssetB || '-'}.`,
    );
  }
  return bridgeContract;
}

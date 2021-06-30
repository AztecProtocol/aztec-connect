#!/usr/bin/env node
import { Contract, ContractFactory, Signer } from 'ethers';
import ERC20Permit from '../../artifacts/contracts/test/ERC20Permit.sol/ERC20Permit.json';
import ERC20Mintable from '../../artifacts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json';

export async function addAsset(rollup: Contract, signer: Signer, supportsPermit: boolean, decimals = 18) {
  if (supportsPermit) {
    console.error('Deploying ERC20 with permit support...');
    const erc20Factory = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode, signer);
    const erc20 = await erc20Factory.deploy();
    console.error(`ERC20 contract address: ${erc20.address}`);
    if (decimals !== 18) {
      console.error(`Changing decimals to: ${decimals}...`);
      await erc20.setDecimals(decimals);
    }
    await setSupportedAsset(rollup, erc20.address, supportsPermit);
    return erc20;
  } else {
    console.error('Deploying ERC20...');
    const erc20Factory = new ContractFactory(ERC20Mintable.abi, ERC20Mintable.bytecode, signer);
    const erc20 = await erc20Factory.deploy();
    console.error(`ERC20 contract address: ${erc20.address}`);
    if (decimals !== 18) {
      console.error(`Changing decimals to: ${decimals}...`);
      await erc20.setDecimals(decimals);
    }
    await setSupportedAsset(rollup, erc20.address, supportsPermit);
    return erc20;
  }
}

export async function setSupportedAsset(rollup: Contract, address: string, supportsPermit: boolean) {
  const tx = await rollup.setSupportedAsset(address, supportsPermit);
  const receipt = await tx.wait();
  const assetId = rollup.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
  console.error(`AssetId: ${assetId}`);
}

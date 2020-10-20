#!/usr/bin/env node
import { Contract, ContractFactory, ethers, Signer } from 'ethers';
import ERC20Permit from '../artifacts/ERC20Permit.json';
import ERC20Mintable from '../artifacts/ERC20Mintable.json';
import RollupProcessor from '../artifacts/RollupProcessor.json';

const { ETHEREUM_HOST, INFURA_API_KEY, NETWORK, PRIVATE_KEY, ROLLUP_CONTRACT_ADDRESS } = process.env;

function getSigner() {
  if (INFURA_API_KEY && NETWORK && PRIVATE_KEY) {
    console.error(`Infura network: ${NETWORK}`);
    const provider = new ethers.providers.InfuraProvider(NETWORK, INFURA_API_KEY);
    return new ethers.Wallet(PRIVATE_KEY, provider) as Signer;
  } else if (ETHEREUM_HOST) {
    console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
    return provider.getSigner(0);
  }
}

export async function addAsset(signer: Signer, hasPermit: boolean) {
  if (hasPermit) {
    console.error('Deploying ERC20 with permit support...');
    const erc20Factory = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode, signer);
    const erc20 = await erc20Factory.deploy();
    console.error(`ERC20 contract address: ${erc20.address}`);
    return erc20.address;
  } else {
    console.error('Deploying ERC20...');
    const erc20Factory = new ContractFactory(ERC20Mintable.abi, ERC20Mintable.bytecode, signer);
    const erc20 = await erc20Factory.deploy();
    console.error(`ERC20 contract address: ${erc20.address}`);
    return erc20.address;
  }
}

export async function setSupportedAsset(rollup: Contract, address: string, supportsPermit: boolean) {
  const tx = await rollup.setSupportedAsset(address, supportsPermit);
  const receipt = await tx.wait();
  const assetId = rollup.interface.parseLog(receipt.logs[receipt.logs.length - 1]).args.assetId;
  console.error(`AssetId: ${assetId}`);
}

async function main() {
  const [, , erc20Address, supportsPermitStr] = process.argv;
  const supportsPermit = !!supportsPermitStr;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  if (!ROLLUP_CONTRACT_ADDRESS) {
    throw new Error('Pass a ROLLUP_CONTRACT_ADDRESS.');
  }

  const rollup = new Contract(ROLLUP_CONTRACT_ADDRESS, RollupProcessor.abi, signer);
  const address = erc20Address ? erc20Address : await addAsset(signer, supportsPermit);

  await setSupportedAsset(rollup, address, supportsPermit);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
import { Contract, ethers, Signer } from 'ethers';
import IUniswapV2Router02 from '../../artifacts/@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json';
import IFeeDistributor from '../../artifacts/contracts/interfaces/IFeeDistributor.sol/IFeeDistributor.json';
import RollupProcessor from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import ERC20Mintable from '../../artifacts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json';
import { createPair } from '../deploy_uniswap';
import { addAsset } from './add_asset';

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
async function main() {
  const [, , erc20Address, supportsPermitStr, initialTokenSupplyStr, initialEthSupplyStr] = process.argv;
  const supportsPermit = !!supportsPermitStr;

  const signer = getSigner();
  if (!signer) {
    throw new Error('Failed to create signer. Set ETHEREUM_HOST or INFURA_API_KEY, NETWORK, PRIVATE_KEY.');
  }

  if (!ROLLUP_CONTRACT_ADDRESS) {
    throw new Error('Pass a ROLLUP_CONTRACT_ADDRESS.');
  }

  const rollup = new Contract(ROLLUP_CONTRACT_ADDRESS, RollupProcessor.abi, signer);
  const asset = erc20Address
    ? new Contract(erc20Address, ERC20Mintable.abi, signer)
    : await addAsset(rollup, signer, supportsPermit);

  const feeDistributorAddress = await rollup.feeDistributor();
  const feeDistributor = new Contract(feeDistributorAddress, IFeeDistributor.abi, signer);
  const uniswapRouter = new Contract(await feeDistributor.router(), IUniswapV2Router02.abi, signer);
  const initialTokenSupply = initialTokenSupplyStr ? BigInt(initialTokenSupplyStr) : undefined;
  const initialEthSupply = initialEthSupplyStr ? BigInt(initialEthSupplyStr) : undefined;
  await createPair(signer, uniswapRouter, asset, initialTokenSupply, initialEthSupply);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

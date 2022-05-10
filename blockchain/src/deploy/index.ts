#!/usr/bin/env node
import { ethers, Signer } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { deployDev } from './deploy_dev';
import { InitHelpers, TreeInitData } from '@aztec/barretenberg/environment';
import { deployMainnet } from './deploy_mainnet';
import { deployMainnetE2e } from './deploy_mainnet_e2e';

const { ETHEREUM_HOST, PRIVATE_KEY, VK } = process.env;

async function getSigner() {
  if (!ETHEREUM_HOST) {
    throw new Error('ETHEREUM_HOST not set.');
  }
  console.error(`Json rpc provider: ${ETHEREUM_HOST}`);
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_HOST);
  const signer = PRIVATE_KEY ? (new ethers.Wallet(PRIVATE_KEY, provider) as Signer) : provider.getSigner(0);
  return new NonceManager(signer);
}

async function deploy(chainId: number, signer: Signer, treeInitData: TreeInitData, vk?: string) {
  switch (chainId) {
    case 1:
    case 0xa57ec:
      return deployMainnet(signer, treeInitData, vk);
    case 0xe2e:
      return deployMainnetE2e(signer, treeInitData, vk);
    default:
      return deployDev(signer, treeInitData, vk);
  }
}

/**
 * We add gasLimit to all txs, to prevent calls to estimateGas that may fail. If a gasLimit is provided the calldata
 * is simply produced, there is nothing to fail. As long as all the txs are executed by the evm in order, things
 * should succeed. The NonceManager ensures all the txs have sequentially increasing nonces.
 * In some cases there maybe a "deployment sync point" which is required if we are making a "call" to the blockchain
 * straight after, that assumes the state is up-to-date at that point.
 * This drastically improves deployment times.
 */
async function main() {
  const signer = await getSigner();

  const signerAddress = await signer.getAddress();
  console.error(`Signer: ${signerAddress}`);

  const chainId = await signer.getChainId();
  console.error(`Chain id: ${chainId}`);

  const treeInitData = InitHelpers.getInitData(chainId);
  const { dataTreeSize, roots } = treeInitData;
  console.error(`Initial data size: ${dataTreeSize}`);
  console.error(`Initial data root: ${roots.dataRoot.toString('hex')}`);
  console.error(`Initial null root: ${roots.nullRoot.toString('hex')}`);
  console.error(`Initial root root: ${roots.rootsRoot.toString('hex')}`);

  const { rollup, priceFeeds, feeDistributor, feePayingAssets } = await deploy(chainId, signer, treeInitData, VK);

  const envVars = {
    ROLLUP_CONTRACT_ADDRESS: rollup.address,
    FEE_DISTRIBUTOR_ADDRESS: feeDistributor.address,
    PRICE_FEED_CONTRACT_ADDRESSES: priceFeeds.map(p => p).join(','),
    FEE_PAYING_ASSET_ADDRESSES: feePayingAssets.join(','),
  };

  for (const [k, v] of Object.entries(envVars)) {
    console.log(`export ${k}=${v}`);
    console.log(`export TF_VAR_${k}=${v}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

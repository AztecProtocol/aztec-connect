import { EthAddress } from '@aztec/barretenberg/address';
import { NonceManager } from '@ethersproject/experimental';
import { ethers, Signer } from 'ethers';
import { InitHelpers, TreeInitData } from '@aztec/barretenberg/environment';
import { deployDev } from './deploy_dev.js';
import { deployMainnet } from './deploy_mainnet.js';
import { deployMainnetE2e } from './deploy_mainnet_e2e.js';
import { deployMainnetFork } from './deploy_mainnet_fork.js';

function getSigner(host?: string, privateKey?: string) {
  if (!host) {
    throw new Error('ETHEREUM_HOST not set.');
  }
  console.error(`Json rpc provider: ${host}`);
  const provider = new ethers.providers.JsonRpcProvider(host);
  const signer = privateKey ? (new ethers.Wallet(privateKey, provider) as Signer) : provider.getSigner(0);
  return new NonceManager(signer);
}

function deploy(
  host: string,
  chainId: number,
  signer: Signer,
  treeInitData: TreeInitData,
  vk: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  switch (chainId) {
    case 1:
      return deployMainnet(signer, treeInitData, vk, faucetOperator, rollupProvider);
    case 0xa57ec:
    case 0xdef:
      return deployMainnetFork(host, signer, treeInitData, vk, faucetOperator, rollupProvider);
    case 0xe2e:
      return deployMainnetE2e(signer, treeInitData, vk, faucetOperator, rollupProvider);
    default:
      return deployDev(signer, treeInitData, vk, faucetOperator, rollupProvider);
  }
}

export async function deployContracts(
  host: string,
  vk?: string,
  privateKey?: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  const signer = getSigner(host, privateKey);
  const signerAddress = await signer.getAddress();
  console.error(`Signer: ${signerAddress}`);

  const chainId = await signer.getChainId();
  console.error(`Chain id: ${chainId}`);

  console.error(`Faucet operator: ${faucetOperator}`);
  console.error(`Rollup provider: ${rollupProvider}`);

  const verificationKey = vk ? vk : 'MockVerificationKey';
  console.log(`Verification key: ${verificationKey}`);

  const treeInitData = InitHelpers.getInitData(chainId);
  const { dataTreeSize, roots } = treeInitData;
  console.error(`Initial data size: ${dataTreeSize}`);
  console.error(`Initial data root: ${roots.dataRoot.toString('hex')}`);
  console.error(`Initial null root: ${roots.nullRoot.toString('hex')}`);
  console.error(`Initial root root: ${roots.rootsRoot.toString('hex')}`);

  const { rollup, priceFeeds, feeDistributor, permitHelper, faucet, bridgeDataProvider } = await deploy(
    host,
    chainId,
    signer,
    treeInitData,
    verificationKey,
    faucetOperator,
    rollupProvider,
  );

  const envVars = {
    ROLLUP_CONTRACT_ADDRESS: rollup.address,
    PERMIT_HELPER_CONTRACT_ADDRESS: permitHelper.address,
    FEE_DISTRIBUTOR_ADDRESS: feeDistributor.address,
    PRICE_FEED_CONTRACT_ADDRESSES: priceFeeds.map(p => p).join(','),
    FAUCET_CONTRACT_ADDRESS: faucet.address,
    BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS: bridgeDataProvider.address,
  };

  return envVars;
}

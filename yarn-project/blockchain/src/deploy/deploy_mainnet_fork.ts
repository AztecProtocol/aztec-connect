import { ethers, Signer } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';
import { TreeInitData } from '@aztec/barretenberg/environment';
import { deployMainnet } from './deploy_mainnet.js';
import { setEthBalance } from '../tenderly/index.js';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { NonceManager } from '@ethersproject/experimental';

const balanceToSet = 10n ** 24n;

function notUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const createRandomSigner = (signer: Signer) => {
  const randomKey = randomBytes(32);
  return new NonceManager(new ethers.Wallet(randomKey, signer.provider) as Signer);
};

async function deployToTenderly(
  host: string,
  signer: Signer,
  treeInitData: TreeInitData,
  vk: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  // create a randomly generated private key for deployment
  const randomSigner = createRandomSigner(signer);
  const signerAddress = await randomSigner.getAddress();
  const addressesToTopup = [EthAddress.fromString(signerAddress), faucetOperator, rollupProvider];
  await setEthBalance(addressesToTopup.filter(notUndefined), balanceToSet, host);
  return await deployMainnet(randomSigner, treeInitData, vk, faucetOperator, rollupProvider);
}

export async function deployMainnetFork(
  host: string,
  signer: Signer,
  treeInitData: TreeInitData,
  vk: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  if (host.includes('tenderly')) {
    return await deployToTenderly(host, signer, treeInitData, vk, faucetOperator, rollupProvider);
  }
  return await deployMainnet(signer, treeInitData, vk, faucetOperator, rollupProvider);
}

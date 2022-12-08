import { ContractFactory } from 'ethers';
import { Asset, EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TokenAsset } from '../token_asset.js';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthAsset } from '../eth_asset.js';
import { ERC20Permit } from '../../../abis.js';
import { Web3Provider } from '@ethersproject/providers';

export const setupAssets = async (
  provider: EthereumProvider,
  publisher: EthAddress,
  mintUsers: EthAddress[],
  mintAmount: bigint,
  numAssets = 1,
) => {
  const web3Provider = new Web3Provider(provider);
  const signer = web3Provider.getSigner(publisher.toString());
  const erc20Factory = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode, signer);
  const assets: Asset[] = [new EthAsset(provider)];
  for (let i = 0; i < numAssets; ++i) {
    const asset = await erc20Factory.deploy('TEST');
    const tokenAsset = await TokenAsset.fromAddress(EthAddress.fromString(asset.address), provider, 55000);

    for (const user of mintUsers) {
      await tokenAsset.mint(mintAmount, user);
    }

    assets.push(tokenAsset);
  }

  return assets;
};

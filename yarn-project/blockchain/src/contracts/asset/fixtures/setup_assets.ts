import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { Asset } from '@aztec/barretenberg/blockchain';
import { TokenAsset } from '../token_asset.js';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthersAdapter } from '../../../provider/index.js';
import { EthAsset } from '../eth_asset.js';
import { ERC20Permit } from '../../../abis.js';

export const setupAssets = async (publisher: Signer, mintUsers: Signer[], mintAmount: bigint, numAssets = 1) => {
  const erc20Factory = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode, publisher);
  const provider = new EthersAdapter(ethers.provider);
  const assets: Asset[] = [new EthAsset(provider)];
  for (let i = 0; i < numAssets; ++i) {
    const asset = await erc20Factory.deploy('TEST');
    const tokenAsset = await TokenAsset.fromAddress(
      EthAddress.fromString(asset.address),
      new EthersAdapter(ethers.provider),
      55000,
    );

    for (const user of mintUsers) {
      const userAddress = EthAddress.fromString(await user.getAddress());
      await tokenAsset.mint(mintAmount, userAddress);
    }

    assets.push(tokenAsset);
  }

  return assets;
};

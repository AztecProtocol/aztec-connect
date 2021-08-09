import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { Asset } from '@aztec/barretenberg/blockchain';
import { TokenAsset } from '../token_asset';
import { EthAddress } from '@aztec/barretenberg/address';
import WETH9 from '../../../abis/WETH9.json';
import { EthersAdapter } from '../../../provider';
import { EthAsset } from '../eth_asset';

export const createWeth = async (publisher: Signer) => {
  const WETHFactory = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, publisher);
  return WETHFactory.deploy();
};

export const setupAssets = async (publisher: Signer, mintUsers: Signer[], mintAmount: bigint, numAssets = 1) => {
  const ERC20 = await ethers.getContractFactory('ERC20Permit', publisher);
  const provider = new EthersAdapter(ethers.provider);
  const assets: Asset[] = [new EthAsset(provider)];
  for (let i = 0; i < numAssets; ++i) {
    const asset = await ERC20.deploy();
    const tokenAsset = await TokenAsset.fromAddress(
      EthAddress.fromString(asset.address),
      new EthersAdapter(ethers.provider),
      false,
    );

    for (const user of mintUsers) {
      const userAddress = EthAddress.fromString(await user.getAddress());
      await tokenAsset.mint(mintAmount, userAddress);
    }

    assets.push(tokenAsset);
  }

  return assets;
};

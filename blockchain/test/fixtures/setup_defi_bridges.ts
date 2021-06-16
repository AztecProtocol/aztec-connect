import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { BridgeId } from 'barretenberg/client_proofs';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import WETH9 from '../../src/contracts/WETH9.json';
import { TokenAsset } from './assets';

export interface DefiBridge {
  id: BridgeId;
  contract: Contract;
}

export const deployMockDefiBridge = async (
  publisher: Signer,
  numOutputAssets: number,
  inputAsset: EthAddress,
  outputAssetA: EthAddress,
  outputAssetB: EthAddress,
  minInputValue = 0n,
  outputValueA = 0n,
  outputValueB = 0n,
  topup = true,
  topupValue?: bigint,
) => {
  const UniswapBridge = await ethers.getContractFactory('MockDefiBridge', publisher);
  const bridge = await UniswapBridge.deploy(
    numOutputAssets,
    inputAsset.toString(),
    outputAssetA.toString(),
    outputAssetB.toString(),
    minInputValue,
    outputValueA,
    outputValueB,
  );

  const mint = async (assetAddress: EthAddress, amount: bigint) => {
    const ERC20Mintable = await ethers.getContractFactory('ERC20Mintable');
    const erc20 = new ethers.Contract(assetAddress.toString(), ERC20Mintable.interface, publisher);
    const balanceBefore = BigInt(await erc20.balanceOf(bridge.address));
    await erc20.mint(bridge.address, amount);
    const balanceAfter = BigInt(await erc20.balanceOf(bridge.address));
    if (balanceAfter === balanceBefore) {
      // Not a mintable contract. Transfer WETH instead.
      const weth = new Contract(assetAddress.toString(), WETH9.abi, publisher);
      await weth.deposit({ value: amount });
      await weth.transfer(bridge.address, amount);
    }
  };
  if (topup && outputValueA > 0 && !outputAssetA.equals(EthAddress.ZERO)) {
    await mint(outputAssetA, topupValue !== undefined ? topupValue : outputValueA);
  }
  if (topup && outputValueB > 0 && !outputAssetB.equals(EthAddress.ZERO)) {
    await mint(outputAssetB, topupValue !== undefined ? topupValue : outputValueB);
  }

  return bridge;
};

export const setupDefiBridges = async (
  publisher: Signer,
  rollupProcessor: Contract,
  uniswapRouter: Contract,
  assets: TokenAsset[],
) => {
  const UniswapBridge = await ethers.getContractFactory('UniswapBridge', publisher);
  const weth = await uniswapRouter.WETH();
  const uniswapBridges: { [key: number]: DefiBridge }[] = [...Array(assets.length + 1)].map(() => ({}));

  for (const asset of assets) {
    const ethToToken = await UniswapBridge.deploy(
      rollupProcessor.address,
      uniswapRouter.address,
      weth,
      asset.contract.address,
    );
    uniswapBridges[AssetId.ETH][asset.id] = {
      id: new BridgeId(EthAddress.fromString(ethToToken.address), 1, AssetId.ETH, asset.id, 0),
      contract: ethToToken,
    };

    const tokenToEth = await UniswapBridge.deploy(
      rollupProcessor.address,
      uniswapRouter.address,
      asset.contract.address,
      weth,
    );
    uniswapBridges[asset.id][AssetId.ETH] = {
      id: new BridgeId(EthAddress.fromString(tokenToEth.address), 1, asset.id, AssetId.ETH, 0),
      contract: tokenToEth,
    };
  }

  return {
    uniswapBridges,
  };
};

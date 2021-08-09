import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import WETH9 from '../../../abis/WETH9.json';

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
  assets: Asset[],
) => {
  const UniswapBridge = await ethers.getContractFactory('UniswapBridge', publisher);
  const weth = await uniswapRouter.WETH();
  const uniswapBridgeIds: BridgeId[][] = [...Array(assets.length)].map(() => []);
  const uniswapBridgeAddrs: EthAddress[][] = [...Array(assets.length)].map(() => []);

  for (let assetId = 1; assetId < assets.length; ++assetId) {
    const asset = assets[assetId];
    const ethToToken = await UniswapBridge.deploy(
      rollupProcessor.address,
      uniswapRouter.address,
      weth,
      asset.getStaticInfo().address.toString(),
    );
    uniswapBridgeIds[AssetId.ETH][assetId] = new BridgeId(
      EthAddress.fromString(ethToToken.address),
      1,
      AssetId.ETH,
      assetId,
      0,
    );
    uniswapBridgeAddrs[AssetId.ETH][assetId] = EthAddress.fromString(ethToToken.address);

    const tokenToEth = await UniswapBridge.deploy(
      rollupProcessor.address,
      uniswapRouter.address,
      asset.getStaticInfo().address.toString(),
      weth,
    );
    uniswapBridgeIds[assetId][AssetId.ETH] = new BridgeId(
      EthAddress.fromString(tokenToEth.address),
      1,
      assetId,
      AssetId.ETH,
      0,
    );
    uniswapBridgeAddrs[assetId][AssetId.ETH] = EthAddress.fromString(tokenToEth.address);
  }

  return {
    uniswapBridgeIds,
    uniswapBridgeAddrs,
  };
};

export const deployMockBridge = async (
  rollupProvider: Signer,
  assetAddresses: EthAddress[],
  { numOutputAssets, inputAssetId, outputAssetIdA, outputAssetIdB }: Partial<BridgeId>,
  minInputValue = 0n,
  outputValueA = 0n,
  outputValueB = 0n,
  topup = true,
  topupValue?: bigint,
) => {
  numOutputAssets = numOutputAssets !== undefined ? numOutputAssets : 1;
  inputAssetId = inputAssetId !== undefined ? inputAssetId : AssetId.ETH;
  outputAssetIdA = outputAssetIdA !== undefined ? outputAssetIdA : AssetId.DAI;
  const outputAssetB = outputAssetIdB !== undefined ? assetAddresses[outputAssetIdB] : EthAddress.ZERO;
  const bridge = await deployMockDefiBridge(
    rollupProvider,
    numOutputAssets,
    assetAddresses[inputAssetId],
    assetAddresses[outputAssetIdA],
    outputAssetB,
    minInputValue,
    outputValueA,
    outputValueB,
    topup,
    topupValue,
  );
  return new BridgeId(
    EthAddress.fromString(bridge.address),
    numOutputAssets,
    inputAssetId,
    outputAssetIdA,
    outputAssetIdB || 0,
  );
};

import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';

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
    if (assetAddress.equals(EthAddress.ZERO)) {
      await publisher.sendTransaction({ value: `0x${amount.toString(16)}`, to: bridge.address });
    } else {
      const ERC20Mintable = await ethers.getContractFactory('ERC20Mintable');
      const erc20 = new ethers.Contract(assetAddress.toString(), ERC20Mintable.interface, publisher);
      await erc20.mint(bridge.address, amount);
    }
  };
  if (topup && outputValueA > 0) {
    await mint(outputAssetA, topupValue !== undefined ? topupValue : outputValueA);
  }
  if (topup && outputValueB > 0) {
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
  const uniswapBridgeIds: BridgeId[][] = [...Array(assets.length)].map(() => []);
  const uniswapBridgeAddrs: EthAddress[][] = [...Array(assets.length)].map(() => []);

  for (let i = 0; i < assets.length; ++i) {
    for (let j = 0; j < assets.length; ++j) {
      if (i == j) {
        continue;
      }
      const assetA = assets[i];
      const assetB = assets[j];
      const uniswapBridge = await UniswapBridge.deploy(
        rollupProcessor.address,
        uniswapRouter.address,
        assetA.getStaticInfo().address.toString(),
        assetB.getStaticInfo().address.toString(),
      );
      uniswapBridgeIds[i][j] = new BridgeId(EthAddress.fromString(uniswapBridge.address), 1, i, j, 0);
      uniswapBridgeAddrs[i][j] = EthAddress.fromString(uniswapBridge.address);
    }
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

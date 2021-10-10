import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';

export interface MockBridgeParams {
  numOutputAssets?: number;
  inputAssetId?: AssetId;
  outputAssetIdA?: AssetId;
  outputAssetIdB?: AssetId;
  inputAsset?: EthAddress;
  outputAssetA?: EthAddress;
  outputAssetB?: EthAddress;
  canConvert?: boolean;
  outputValueA?: bigint;
  outputValueB?: bigint;
  returnValueA?: bigint;
  returnValueB?: bigint;
  returnInputValue?: bigint;
  isAsync?: boolean;
  maxTxs?: number;
}

export const deployMockBridge = async (
  publisher: Signer,
  rollupProcessor: EthAddress,
  assetAddresses: EthAddress[],
  {
    numOutputAssets = 1,
    inputAssetId = AssetId.DAI,
    outputAssetIdA = AssetId.renBTC,
    outputAssetIdB = AssetId.ETH,
    inputAsset = assetAddresses[inputAssetId],
    outputAssetA = assetAddresses[outputAssetIdA],
    outputAssetB = assetAddresses[outputAssetIdB],
    canConvert = true,
    outputValueA = 10n,
    outputValueB = 0n,
    returnValueA = outputValueA,
    returnValueB = outputValueB,
    returnInputValue = 0n,
    isAsync = false,
    maxTxs = 100,
  }: MockBridgeParams = {},
) => {
  const DefiBridge = await ethers.getContractFactory('MockDefiBridge', publisher);
  const bridge = await DefiBridge.deploy(
    rollupProcessor.toString(),
    numOutputAssets,
    inputAsset.toString(),
    outputAssetA.toString(),
    outputAssetB.toString(),
    canConvert,
    outputValueA,
    outputValueB,
    returnValueA,
    returnValueB,
    returnInputValue,
    isAsync,
  );

  const mint = async (assetAddress: EthAddress, amount: bigint) => {
    if (!amount) return;
    if (assetAddress.equals(EthAddress.ZERO)) {
      await publisher.sendTransaction({ value: `0x${amount.toString(16)}`, to: bridge.address });
    } else {
      const ERC20Mintable = await ethers.getContractFactory('ERC20Mintable');
      const erc20 = new ethers.Contract(assetAddress.toString(), ERC20Mintable.interface, publisher);
      await erc20.mint(bridge.address, amount);
    }
  };
  await mint(outputAssetA, returnValueA * BigInt(maxTxs));
  await mint(outputAssetB, returnValueB * BigInt(maxTxs));
  await mint(inputAsset, returnInputValue * BigInt(maxTxs));

  await bridge.deployed();

  return new BridgeId(
    EthAddress.fromString(bridge.address),
    numOutputAssets,
    inputAssetId,
    outputAssetIdA,
    outputAssetIdB,
  );
};

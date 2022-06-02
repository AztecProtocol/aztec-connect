import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { RollupProcessor } from '../rollup_processor';
import { DefiBridge } from '../../defi_bridge';
import { EthersAdapter } from '../../..';

export interface MockBridgeParams {
  inputAssetIdA?: number;
  inputAssetIdB?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  canConvert?: boolean;
  outputValueA?: bigint;
  outputValueB?: bigint;
  returnValueA?: bigint;
  returnValueB?: bigint;
  returnInputValue?: bigint;
  isAsync?: boolean;
  maxTxs?: number;
  auxData?: number;
  bridgeGasLimit?: number;
}

export const deployMockBridge = async (
  publisher: Signer,
  rollupProcessor: RollupProcessor,
  assetAddresses: EthAddress[],
  {
    inputAssetIdA = 1,
    inputAssetIdB,
    outputAssetIdA = 2,
    outputAssetIdB,
    canConvert = true,
    outputValueA = 10n,
    outputValueB = 0n,
    returnValueA = outputValueA,
    returnValueB = outputValueB,
    returnInputValue = 0n,
    isAsync = false,
    maxTxs = 100,
    auxData = 0,
    bridgeGasLimit = 300000,
  }: MockBridgeParams = {},
) => {
  const DefiBridge = await ethers.getContractFactory('MockDefiBridge', publisher);
  const bridge = await DefiBridge.deploy(
    rollupProcessor.address.toString(),
    canConvert,
    outputValueA,
    outputValueB,
    returnValueA,
    returnValueB,
    returnInputValue,
    isAsync,
  );

  await bridge.deployed();

  const address = EthAddress.fromString(bridge.address);
  await rollupProcessor.setSupportedBridge(address, bridgeGasLimit);
  const bridgeAddressId = (await rollupProcessor.getSupportedBridges()).length;

  const bridgeId = new BridgeId(bridgeAddressId, inputAssetIdA, outputAssetIdA, inputAssetIdB, outputAssetIdB, auxData);

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
  if (assetAddresses[inputAssetIdA]) {
    await mint(assetAddresses[inputAssetIdA], returnInputValue * BigInt(maxTxs));
  }
  if (assetAddresses[outputAssetIdA]) {
    await mint(assetAddresses[outputAssetIdA], returnValueA * BigInt(maxTxs));
  }
  if (assetAddresses[inputAssetIdB!]) {
    await mint(assetAddresses[inputAssetIdB!], returnInputValue * BigInt(maxTxs));
  }
  if (assetAddresses[outputAssetIdB!]) {
    await mint(assetAddresses[outputAssetIdB!], returnValueB * BigInt(maxTxs));
  }

  return bridgeId;
};

export const mockAsyncBridge = async (
  rollupProvider: Signer,
  rollupProcessor: RollupProcessor,
  assetAddresses: EthAddress[],
  params: MockBridgeParams = {},
) => {
  const bridgeId = await deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, {
    ...params,
    isAsync: true,
  });
  const bridgeAddress = await rollupProcessor.getSupportedBridge(bridgeId.addressId);
  const bridge = new DefiBridge(bridgeAddress, new EthersAdapter(ethers.provider));
  return { bridgeId, bridge };
};

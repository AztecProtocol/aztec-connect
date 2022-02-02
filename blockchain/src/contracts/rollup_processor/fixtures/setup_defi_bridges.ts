import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId, BitConfig } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { RollupProcessor } from '../rollup_processor';

export interface MockBridgeParams {
  inputAssetId?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  inputAsset?: EthAddress;
  outputAssetA?: EthAddress;
  outputAssetB?: EthAddress;
  secondOutputAssetValid?: boolean;
  secondOutputVirtual?: boolean;
  secondInputVirtual?: boolean;
  canConvert?: boolean;
  outputValueA?: bigint;
  outputValueB?: bigint;
  returnValueA?: bigint;
  returnValueB?: bigint;
  returnInputValue?: bigint;
  isAsync?: boolean;
  maxTxs?: number;
  openingNonce?: number;
  auxData?: number;
}

export const deployMockBridge = async (
  publisher: Signer,
  rollupProcessor: RollupProcessor,
  assetAddresses: EthAddress[],
  {
    inputAssetId = 1,
    outputAssetIdA = 2,
    outputAssetIdB = 0,
    inputAsset = assetAddresses[inputAssetId],
    outputAssetA = assetAddresses[outputAssetIdA],
    outputAssetB = assetAddresses[outputAssetIdB],
    secondOutputAssetValid = false,
    secondOutputVirtual = false,
    secondInputVirtual = false,
    canConvert = true,
    outputValueA = 10n,
    outputValueB = 0n,
    returnValueA = outputValueA,
    returnValueB = outputValueB,
    returnInputValue = 0n,
    isAsync = false,
    maxTxs = 100,
    openingNonce = 0,
    auxData = 0,
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

  const address = EthAddress.fromString(bridge.address);
  await rollupProcessor.setSupportedBridge(address, 0);
  const bridgeAddressId = await rollupProcessor.getBridgeAddressId(address);

  return new BridgeId(
    bridgeAddressId,
    inputAssetId,
    outputAssetIdA,
    outputAssetIdB,
    openingNonce,
    new BitConfig(false, secondInputVirtual, false, secondOutputVirtual, false, secondOutputAssetValid),
    auxData,
  );
};

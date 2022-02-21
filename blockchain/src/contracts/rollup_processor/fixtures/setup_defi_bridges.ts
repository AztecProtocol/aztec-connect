import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId, BitConfig } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { RollupProcessor } from '../rollup_processor';

export interface MockBridgeParams {
  inputAssetIdA?: number;
  inputAssetIdB?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  inputAssetA?: EthAddress;
  inputAssetB?: EthAddress;
  outputAssetA?: EthAddress;
  outputAssetB?: EthAddress;
  firstInputVirtual?: boolean;
  firstInputAssetValid?: boolean;
  firstOutputVirtual?: boolean;
  firstOutputAssetValid?: boolean;
  secondOutputAssetValid?: boolean;
  secondOutputVirtual?: boolean;
  secondInputVirtual?: boolean;
  secondInputAssetValid?: boolean;
  canConvert?: boolean;
  outputValueA?: bigint;
  outputValueB?: bigint;
  returnValueA?: bigint;
  returnValueB?: bigint;
  returnInputValue?: bigint;
  isAsync?: boolean;
  maxTxs?: number;
  auxData?: number;
}

export const deployMockBridge = async (
  publisher: Signer,
  rollupProcessor: RollupProcessor,
  assetAddresses: EthAddress[],
  {
    inputAssetIdA = 1,
    inputAssetIdB = 2,
    outputAssetIdA = 2,
    outputAssetIdB = 0,
    inputAssetA = assetAddresses[1],
    inputAssetB = assetAddresses[2],
    outputAssetA = assetAddresses[2],
    outputAssetB = assetAddresses[0],
    firstInputVirtual = false,
    firstInputAssetValid = true,
    firstOutputVirtual = false,
    firstOutputAssetValid = true,
    secondOutputAssetValid = false,
    secondOutputVirtual = false,
    secondInputVirtual = false,
    secondInputAssetValid = false,
    canConvert = true,
    outputValueA = 10n,
    outputValueB = 0n,
    returnValueA = outputValueA,
    returnValueB = outputValueB,
    returnInputValue = 0n,
    isAsync = false,
    maxTxs = 100,
    auxData = 0,
  }: MockBridgeParams = {},
) => {
  if (firstInputAssetValid) {
    inputAssetA = assetAddresses[inputAssetIdA];
  }
  if (secondInputAssetValid) {
    inputAssetB = assetAddresses[inputAssetIdB];
  }
  if (firstOutputAssetValid) {
    outputAssetA = assetAddresses[outputAssetIdA];
  }
  if (secondOutputAssetValid) {
    outputAssetB = assetAddresses[outputAssetIdB];
  }
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
  if (firstOutputAssetValid) {
    await mint(outputAssetA, returnValueA * BigInt(maxTxs));
  }
  if (secondOutputAssetValid) {
    await mint(outputAssetB, returnValueB * BigInt(maxTxs));
  }
  if (firstInputAssetValid) {
    await mint(inputAssetA, returnInputValue * BigInt(maxTxs));
  }
  if (secondInputAssetValid) {
    await mint(inputAssetB, returnInputValue * BigInt(maxTxs));
  }

  await bridge.deployed();

  const address = EthAddress.fromString(bridge.address);
  await rollupProcessor.setSupportedBridge(address, 0);
  const bridgeAddressId = await rollupProcessor.getBridgeAddressId(address);

  return new BridgeId(
    bridgeAddressId,
    inputAssetIdA,
    outputAssetIdA,
    outputAssetIdB,
    inputAssetIdB,
    new BitConfig(
      firstInputVirtual,
      secondInputVirtual,
      firstOutputVirtual,
      secondOutputVirtual,
      secondInputAssetValid,
      secondOutputAssetValid,
    ),
    auxData,
  );
};

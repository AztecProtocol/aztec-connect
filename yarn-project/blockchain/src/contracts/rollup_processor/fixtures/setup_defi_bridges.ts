import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ContractFactory, ethers } from 'ethers';
import { RollupProcessor } from '../rollup_processor.js';
import { MockDefiBridge, ERC20Permit } from '../../../abis.js';
import { Web3Provider } from '@ethersproject/providers';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';

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
  auxData?: bigint;
  bridgeGasLimit?: number;
}

export const deployMockBridge = async (
  provider: EthereumProvider,
  publisher: EthAddress,
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
    auxData = 0n,
    bridgeGasLimit = 300000,
  }: MockBridgeParams = {},
) => {
  const signer = new Web3Provider(provider).getSigner(publisher.toString());
  const DefiBridge = new ContractFactory(MockDefiBridge.abi, MockDefiBridge.bytecode, signer);
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

  const bridgeCallData = new BridgeCallData(
    bridgeAddressId,
    inputAssetIdA,
    outputAssetIdA,
    inputAssetIdB,
    outputAssetIdB,
    auxData,
  );

  const mint = async (assetAddress: EthAddress, amount: bigint) => {
    if (!amount) return;
    if (assetAddress.equals(EthAddress.ZERO)) {
      await signer.sendTransaction({ value: `0x${amount.toString(16)}`, to: bridge.address });
    } else {
      const ERC20Mintable = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode);
      const erc20 = new ethers.Contract(assetAddress.toString(), ERC20Mintable.interface, signer);
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

  return bridgeCallData;
};

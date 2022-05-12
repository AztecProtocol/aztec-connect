import { BridgeId, AztecSdk, EthereumProvider, EthAddress, AssetValue } from '@aztec/sdk';
import { ElementBridgeData } from '@aztec/bridge-clients/client-dest/src/client/element/element-bridge-data';
import { AztecAsset, AztecAssetType } from '@aztec/bridge-clients/client-dest/src/client/bridge-data';
import { ChainProperties } from '@aztec/bridge-clients/client-dest/src/client/element/element-bridge-data';

export const BALANCER_ADDRESS = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
export const UNISWAP_BRIDGE_ADDRESS_ID = 1;
export const ELEMENT_BRIDGE_ADDRESS_ID = 2;

export const ELEMENT_CHECKPOINTS = [1644604852, 1651275535];
export const ELEMENT_START_TIME = 1640995200;

export interface BridgeSpec {
  inputAsset: number;
  outputAsset: number;
  addressId: number;
}

export const bridgeConfigs: BridgeSpec[] = [
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000004000000000000001',
    inputAsset: 0,
    outputAsset: 1,
    addressId: UNISWAP_BRIDGE_ADDRESS_ID,
  },
  {
    //bridgeId: '0x0000000000000000000000000000000000000000000000000000000100000002',
    inputAsset: 1,
    outputAsset: 0,
    addressId: UNISWAP_BRIDGE_ADDRESS_ID,
  },
];

export const getBridgeId = (bridgeSpec: BridgeSpec) => {
  return buildBridgeId(bridgeSpec.addressId, bridgeSpec.inputAsset, bridgeSpec.outputAsset, 0);
};

export const buildBridgeId = (addressId: number, inputAsset: number, outputAsset: number, auxData: number) => {
  return new BridgeId(addressId, inputAsset, outputAsset, undefined, undefined, auxData);
};

export const formatTime = (unixTimeInSeconds: number) => {
  return new Date(unixTimeInSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
};

export const assetSpecs: { [key: number]: bigint } = {
  4: 10n ** 9n,
  3: 10n ** 5n,
  5: 10n ** 3n,
  6: 10n ** 5n,
  8: 10n ** 15n,
  9: 10n ** 15n,
};

export interface AgentElementConfig {
  assetId: number;
  expiry?: number;
  assetQuantity: bigint; // amount of asset to use for entire tranche
}

export const createElementBridgeData = async (sdk: AztecSdk, provider: EthereumProvider) => {
  const status = await sdk.getRemoteStatus();
  const rollupContractAddress = status.blockchainStatus.rollupContractAddress;
  const elementBridge = status.blockchainStatus.bridges.find(a => a.id == ELEMENT_BRIDGE_ADDRESS_ID);
  if (!elementBridge) {
    console.log('failed to find element bridge address!!');
    return;
  }

  const chainProperties: ChainProperties = { eventBatchSize: 10 };
  const balancerAddress = EthAddress.fromString(BALANCER_ADDRESS);

  console.log('creating element bridge data class');
  console.log('element bridge address', elementBridge.address.toString());
  console.log('rollup contract address', rollupContractAddress.toString());
  console.log('vault address', balancerAddress.toString());
  return ElementBridgeData.create(
    provider,
    elementBridge.address as any,
    balancerAddress as any,
    rollupContractAddress as any,
    chainProperties,
  );
};

export const retrieveElementConfig = async (sdk: AztecSdk, provider: EthereumProvider, assetIds: number[]) => {
  const elementBridgeData = await createElementBridgeData(sdk, provider);
  if (!elementBridgeData) {
    return assetIds.map(assetId => {
      return {
        assetId,
        expiry: undefined,
        assetQuantity: 0n,
      } as AgentElementConfig;
    });
  }
  const createAztecAsset = (asset: number, address: EthAddress, type: AztecAssetType = AztecAssetType.ERC20) => {
    return {
      id: BigInt(asset),
      assetType: type,
      erc20Address: address.toString(),
    } as AztecAsset;
  };

  const promises = assetIds.map(async assetId => {
    const assetAddress = sdk.getAssetInfo(assetId).address;
    const expiries = await elementBridgeData.getAuxData(
      createAztecAsset(assetId, assetAddress),
      createAztecAsset(0, EthAddress.ZERO, AztecAssetType.NOT_USED),
      createAztecAsset(assetId, assetAddress),
      createAztecAsset(0, EthAddress.ZERO, AztecAssetType.NOT_USED),
    );
    return expiries.map(exp => {
      return {
        assetId,
        expiry: Number(exp),
        assetQuantity: 0n,
      } as AgentElementConfig;
    });
  });
  return (await Promise.all(promises)).flat().sort((l, r) => {
    if (l.expiry! < r.expiry!) {
      return -1;
    }
    return l.expiry! > r.expiry! ? 1 : 0;
  });
};

export const getAssetRequirementsForElement = async (sdk: AztecSdk, provider: EthereumProvider, assetIds: number[]) => {
  const elementConfig = await retrieveElementConfig(sdk, provider, assetIds);
  const assetValues: AssetValue[] = [];
  for (const config of elementConfig) {
    const assetValueIndex = assetValues.findIndex(x => x.assetId == config.assetId);
    const assetQuantityPerTranche = assetSpecs[config.assetId];
    if (assetValueIndex == -1) {
      assetValues.push({ assetId: config.assetId, value: assetQuantityPerTranche });
    } else {
      assetValues[assetValueIndex].value += assetQuantityPerTranche;
    }
  }
  return assetValues;
};

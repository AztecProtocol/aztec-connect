import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumProvider, BridgeData, BridgeSubsidy } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { IBridgeDataProvider, MockBridgeDataProvider } from '../../abis.js';
import { Contract } from 'ethers';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { WalletProvider } from '../../index.js';

// helper function to set the subsidy for a specified bridge on the mock data provider used in tests
export async function setMockBridgeSubsidy(
  provider: WalletProvider,
  bridgeDataProviderAddress: EthAddress,
  bridgeAddressId: number,
  subsidy: number,
  signingAddress?: EthAddress,
) {
  const web3Provider = new Web3Provider(provider);
  const signer = web3Provider.getSigner(signingAddress ? signingAddress.toString() : 0);
  const dataProviderContract = new Contract(bridgeDataProviderAddress.toString(), MockBridgeDataProvider.abi, signer);
  await dataProviderContract.updateSubsidy(bridgeAddressId, subsidy);
}

const createContract = (bridgeDataProviderAddress: string, provider: EthereumProvider) => {
  return new Contract(bridgeDataProviderAddress, IBridgeDataProvider.abi, new Web3Provider(provider));
};

// Class that acts as a wrapper for the on-chain contract
// Caches returned bridge data to reduce requests
// Resets cached bridge subsidy values requiring a refresh from chain
export class BridgeDataProvider {
  private contract: Contract;
  private subsidyCache: { [key: string]: BridgeSubsidy } = {};
  private bridgeDataCache: { [key: number]: BridgeData } = {};
  constructor(
    private bridgeDataProviderAddress: EthAddress,
    ethereumProvider: EthereumProvider,
    contractCreation: () => Contract = () => createContract(bridgeDataProviderAddress.toString(), ethereumProvider),
  ) {
    this.contract = contractCreation();
  }

  get address() {
    return this.bridgeDataProviderAddress;
  }

  public async getBridgeSubsidy(bridgeCallData: bigint) {
    const bd = BridgeCallData.fromBigInt(bridgeCallData);
    const bridgeCallDataAsString = bd.toString();
    if (this.subsidyCache[bridgeCallDataAsString] === undefined) {
      const [criteria, subsidyInWei, subsidyInGas] = await this.contract.getAccumulatedSubsidyAmount(bridgeCallData);
      this.subsidyCache[bridgeCallDataAsString] = {
        addressId: bd.bridgeAddressId,
        subsidyInGas: subsidyInGas.toNumber(),
        subsidyInWei: subsidyInWei.toBigInt(),
        criteria: criteria.toBigInt(),
      } as BridgeSubsidy;
    }
    return this.subsidyCache[bridgeCallDataAsString];
  }

  public async getBridgeData(bridgeAddressId: number) {
    if (this.bridgeDataCache[bridgeAddressId] === undefined) {
      const data = await this.contract.getBridge(bridgeAddressId);
      const bridgeData: BridgeData = {
        address: EthAddress.fromString(data.bridgeAddress),
        addressId: data.bridgeAddressId.toNumber(),
        description: data.label,
      };
      this.bridgeDataCache[bridgeAddressId] = bridgeData;
    }

    return this.bridgeDataCache[bridgeAddressId];
  }

  public updatePerEthBlockState() {
    // clear the subsidy cache with each eth block as this will continuously change
    this.subsidyCache = {};
  }
}

import { ContractFactory, Signer } from 'ethers';
import { MockBridgeDataProvider } from '../../abis.js';

export async function deployMockDataProvider(signer: Signer) {
  console.log('Deploying MockDataProvider...');
  const mockDataProviderLibrary = new ContractFactory(
    MockBridgeDataProvider.abi,
    MockBridgeDataProvider.bytecode,
    signer,
  );
  const mockDataProvider = await mockDataProviderLibrary.deploy();
  console.log(`MockDataProvider contract address: ${mockDataProvider.address}.`);
  return mockDataProvider;
}

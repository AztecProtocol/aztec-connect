import { ContractFactory, Signer } from 'ethers';
import { MockBridgeDataProvider } from '../../abis.js';

export async function deployMockDataProvider(signer: Signer) {
  console.error('Deploying MockDataProvider...');
  const mockDataProviderLibrary = new ContractFactory(
    MockBridgeDataProvider.abi,
    MockBridgeDataProvider.bytecode,
    signer,
  );
  const mockDataProvider = await mockDataProviderLibrary.deploy();
  console.error(`MockDataProvider contract address: ${mockDataProvider.address}.`);
  return mockDataProvider;
}

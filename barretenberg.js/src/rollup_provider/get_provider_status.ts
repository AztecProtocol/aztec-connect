import { EthAddress } from '../address';
import { RollupProviderStatusServerResponse } from './server_response';

export async function getProviderStatus(baseUrl: string) {
  const response = await fetch(`${baseUrl}/status`);
  try {
    const body = (await response.json()) as RollupProviderStatusServerResponse;
    const { rollupContractAddress, tokenContractAddresses, dataRoot, nullRoot, rootRoot } = body;
    return {
      ...body,
      rollupContractAddress: EthAddress.fromString(rollupContractAddress),
      tokenContractAddresses: tokenContractAddresses.map(address => EthAddress.fromString(address)),
      dataRoot: Buffer.from(dataRoot, 'hex'),
      nullRoot: Buffer.from(nullRoot, 'hex'),
      rootRoot: Buffer.from(rootRoot, 'hex'),
    };
  } catch (err) {
    throw new Error(`Bad response from: ${baseUrl}`);
  }
}

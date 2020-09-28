import { EthAddress } from '../address';
import { RollupProviderStatusServerResponse } from './server_response';

export async function getProviderStatus(baseUrl: URL) {
  const response = await fetch(`${baseUrl}/status`);
  const body = (await response.json()) as RollupProviderStatusServerResponse;
  const { rollupContractAddress, tokenContractAddress, dataRoot, nullRoot } = body;
  return {
    ...body,
    rollupContractAddress: EthAddress.fromString(rollupContractAddress),
    tokenContractAddress: EthAddress.fromString(tokenContractAddress),
    dataRoot: Buffer.from(dataRoot, 'hex'),
    nullRoot: Buffer.from(nullRoot, 'hex'),
  };
}

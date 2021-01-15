import { EthAddress } from '../address';
import { RollupProviderStatusServerResponse } from './server_response';
import { fetch } from '../iso_fetch';
import { RollupProviderStatus } from './rollup_provider';
import { assetIds, proofIds, AssetId, ProofId } from '../client_proofs';

export async function getProviderStatus(baseUrl: string): Promise<RollupProviderStatus> {
  const response = await fetch(`${baseUrl}/status`);
  try {
    const body = (await response.json()) as RollupProviderStatusServerResponse;
    const { rollupContractAddress, tokenContractAddresses, dataRoot, nullRoot, rootRoot, fees } = body;
    const feesMap: Map<AssetId, Map<ProofId, bigint>> = new Map();
    assetIds.forEach(assetId => {
      const assetFees: Map<ProofId, bigint> = new Map();
      proofIds.forEach(proofId => assetFees.set(proofId, BigInt(fees[assetId][proofId])));
      feesMap.set(assetId, assetFees);
    });

    return {
      ...body,
      rollupContractAddress: EthAddress.fromString(rollupContractAddress),
      tokenContractAddresses: tokenContractAddresses.map(address => EthAddress.fromString(address)),
      dataRoot: Buffer.from(dataRoot, 'hex'),
      nullRoot: Buffer.from(nullRoot, 'hex'),
      rootRoot: Buffer.from(rootRoot, 'hex'),
      fees: feesMap,
    };
  } catch (err) {
    throw new Error(`Bad response from: ${baseUrl}`);
  }
}

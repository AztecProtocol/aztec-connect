import { useRollupProviderStatus } from './rollup_provider_hooks';

export function useAssetInfo(assetId: number) {
  const rpStatus = useRollupProviderStatus();
  const assets = rpStatus?.blockchainStatus.assets;
  if (!assets) return 'loading';
  const asset = assets[assetId];
  if (!asset) return 'not-found';
  return asset;
}

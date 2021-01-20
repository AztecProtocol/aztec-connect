import { AssetId } from './asset_id';
import { ProofId } from './proof_id';

export * from './asset_id';
export * from './proof_id';

const enumValues = <T>(e: T): T[keyof T][] =>
  Object.keys(e)
    .filter(k => typeof e[k] === 'number')
    .map(k => e[k]);

export const assetIds = enumValues(AssetId);
export const proofIds = enumValues(ProofId);

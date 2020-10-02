export * from './proof_type_tag';

export type ProofId = number;

export type ProofType = 'ACCOUNT' | 'JOIN_SPLIT';

export const proofIdToType = (proofId: ProofId) => {
  return proofId === 1 ? 'ACCOUNT' : 'JOIN_SPLIT';
};

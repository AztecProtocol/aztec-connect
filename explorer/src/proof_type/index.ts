export * from './proof_type_tag';

export type ProofId = number;

export enum ProofType {
  ACCOUNT = 'ACCOUNT',
  JOIN_SPLIT = 'JOIN_SPLIT',
}

export enum TransactionType {
  SHIELD = 'SHIELD',
  WITHDRAW = 'WITHDRAW',
  PRIVATE_SEND = 'PRIVATE SEND',
}

export const proofIdToType = (proofId: ProofId): ProofType => {
  return proofId === 1 ? ProofType.ACCOUNT : ProofType.JOIN_SPLIT;
};

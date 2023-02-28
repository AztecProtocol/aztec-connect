import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { ProofInput, ProofRequestData } from '../proofs/index.js';
import { KeyPair } from './key_pair.js';
import { Permission } from './permission.js';

export function shouldBeSignedWithAccountKey(proofInput: ProofInput): boolean {
  if ('inputNotes' in proofInput.tx) {
    const note = proofInput.tx.inputNotes[0];
    return !note.treeNote.accountRequired;
  }
  return proofInput.tx.create;
}

export interface KeyStore {
  connect(permissions?: Permission[]): Promise<{ accountKey: KeyPair; permissions: Permission[] }>;
  disconnect(): Promise<void>;

  getAccountKey(): Promise<KeyPair>;
  getSpendingPublicKey(): Promise<GrumpkinAddress>;

  getPermissions(): Promise<Permission[]>;
  setPermissions(permissions: Permission[]): Promise<void>;

  approveProofsRequest(proofRequestData: ProofRequestData): Promise<{ approved: boolean; error: string }>;
  approveProofInputsRequest(proofRequestData: ProofRequestData): Promise<{ approved: boolean; error: string }>;

  signProofs(proofInputs: ProofInput[]): Promise<SchnorrSignature[]>;
}

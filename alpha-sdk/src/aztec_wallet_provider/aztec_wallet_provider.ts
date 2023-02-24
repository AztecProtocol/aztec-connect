import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { DecryptedData } from '../block_decryptor/index.js';
import { Permission } from '../key_store/index.js';
import { ProofInput, ProofOutput, ProofRequestData } from '../proofs/index.js';

export interface AztecWalletProvider {
  connect(permissions?: Permission[]): Promise<GrumpkinAddress>;
  disconnect(): Promise<void>;

  getAccountPublicKey(): Promise<GrumpkinAddress>;
  getSpendingPublicKey(): Promise<GrumpkinAddress>;

  getPermissions(): Promise<Permission[]>;
  setPermissions(permission: Permission[]): Promise<void>;

  signProofs(proofInputs: ProofInput[]): Promise<SchnorrSignature[]>;
  createProofs(proofInputs: ProofInput[], signatures: SchnorrSignature[]): Promise<ProofOutput[]>;
  requestProofInputs(proofRequestData: ProofRequestData): Promise<ProofInput[]>;
  requestProofs(proofRequestData: ProofRequestData): Promise<ProofOutput[]>;

  // This is here because we need to send the data back to the dApp for persistant storage.
  // It would not be exposed if we solve snapshot and sync directly to the iframe.
  // Ask Joe :)
  // From is inclusive, to is exclusive.
  decryptBlocks(from: number, to: number): Promise<DecryptedData>;
}

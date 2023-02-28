import { ProofInput } from '../proofs/index.js';
import { KeyPair } from './key_pair.js';
import { KeyStore } from './key_store.js';
import { Permission } from './permission.js';

export class ConstantKeyStore implements KeyStore {
  constructor(private accountKey: KeyPair, private spendingKey: KeyPair, private permissions: Permission[] = []) {}

  public connect() {
    return Promise.resolve({ accountKey: this.accountKey, permissions: this.permissions });
  }

  public async disconnect() {
    await Promise.resolve();
  }

  public getAccountKey() {
    return Promise.resolve(this.accountKey);
  }

  public getSpendingPublicKey() {
    return Promise.resolve(this.spendingKey.getPublicKey());
  }

  public getPermissions() {
    return Promise.resolve(this.permissions);
  }

  public async setPermissions(permissions: Permission[]) {
    this.permissions = permissions;
    await Promise.resolve();
  }

  public approveProofsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public approveProofInputsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public signProofs(proofInputs: ProofInput[]) {
    return Promise.all(proofInputs.map(p => this.spendingKey.signMessage(p.signingData)));
  }
}

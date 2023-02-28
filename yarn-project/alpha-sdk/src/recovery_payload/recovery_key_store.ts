import { KeyPair, KeyStore } from '../key_store/index.js';
import { ProofInput } from '../proofs/index.js';
import { RecoveryPayload } from './recovery_payload.js';

export class RecoveryKeyStore implements KeyStore {
  constructor(private accountKey: KeyPair, private recoveryPayload: RecoveryPayload) {}

  public connect() {
    return Promise.resolve({ accountKey: this.accountKey, permissions: [] });
  }

  public async disconnect() {
    await Promise.resolve();
  }

  public getAccountKey() {
    return Promise.resolve(this.accountKey);
  }

  public getSpendingPublicKey() {
    const { recoveryPublicKey } = this.recoveryPayload;
    return Promise.resolve(recoveryPublicKey);
  }

  public getPermissions() {
    return Promise.resolve([]);
  }

  public async setPermissions() {
    throw new Error('`setPermissions` unsupported for RecoveryKeyStore.');
    await Promise.resolve();
  }

  public approveProofsRequest() {
    return Promise.resolve({ approved: true, error: '' });
  }

  public approveProofInputsRequest() {
    return Promise.resolve({ approved: true, error: '' });
  }

  public signProofs(proofInputs: ProofInput[]) {
    const { signature } = this.recoveryPayload.recoveryData;
    return Promise.all(proofInputs.map((p, i) => (i ? this.accountKey.signMessage(p.signingData) : signature)));
  }
}

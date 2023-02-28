import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Schnorr, SchnorrSignature } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { ProofInput } from '../proofs/index.js';
import { ConstantKeyPair } from './constant_key_pair.js';
import { generateLegacyAccountPrivateKey, generateLegacySpendingPrivateKey } from './generate_legacy_private_key.js';
import { KeyPair } from './key_pair.js';
import { KeyStore, shouldBeSignedWithAccountKey } from './key_store.js';
import { Permission } from './permission.js';

function keyPairFromPrivateKey(privateKey: Buffer, wasm: BarretenbergWasm) {
  const schnorr = new Schnorr(wasm);
  const grumpkin = new Grumpkin(wasm);
  const publicKey = GrumpkinAddress.fromPrivateKey(privateKey, grumpkin);
  return new ConstantKeyPair(publicKey, privateKey, schnorr);
}

export class LegacyKeyStore implements KeyStore {
  private accountKey: KeyPair | undefined;
  private spendingPublicKey: GrumpkinAddress | undefined;

  constructor(
    private provider: EthereumProvider,
    private account: EthAddress,
    private wasm: BarretenbergWasm,
    private permissions: Permission[],
  ) {}

  private async generateAccountKey() {
    const privateKey = await generateLegacyAccountPrivateKey(this.provider, this.account);
    const accountKey = keyPairFromPrivateKey(privateKey, this.wasm);
    this.accountKey = accountKey;
    return accountKey;
  }

  private async generateSpendingKey() {
    const privateKey = await generateLegacySpendingPrivateKey(this.provider, this.account);
    const spendingKey = keyPairFromPrivateKey(privateKey, this.wasm);
    this.spendingPublicKey = spendingKey.getPublicKey();
    return spendingKey;
  }

  public async connect() {
    return { accountKey: await this.getAccountKey(), permissions: this.permissions };
  }

  public async disconnect() {}

  public async getAccountKey(): Promise<KeyPair> {
    return this.accountKey || (await this.generateAccountKey());
  }

  public async getSpendingPublicKey() {
    return this.spendingPublicKey || (await this.generateSpendingKey()).getPublicKey();
  }

  public getPermissions() {
    return Promise.resolve(this.permissions);
  }

  public setPermissions(permissions: Permission[]) {
    this.permissions = permissions;
    return Promise.resolve();
  }

  public approveProofsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public approveProofInputsRequest() {
    // TODO - check proof request permission
    return Promise.resolve({ approved: true, error: '' });
  }

  public async signProofs(proofInputs: ProofInput[]): Promise<SchnorrSignature[]> {
    const accountKey = await this.getAccountKey();
    let spendingKey; // Cache spending key for multiple proofs

    return await Promise.all(
      proofInputs.map(async p => {
        let key = accountKey;
        if (!shouldBeSignedWithAccountKey(p)) {
          spendingKey = spendingKey || (await this.generateSpendingKey());
          key = spendingKey;
        }
        return key.signMessage(p.signingData);
      }),
    );
  }
}

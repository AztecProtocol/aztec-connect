import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { DecryptedDataJson, decryptedDataToJson } from '../block_decryptor/block_decryptor.js';
import { Permission } from '../key_store/permission.js';
import {
  proofInputFromJson,
  ProofInputJson,
  proofInputToJson,
  ProofOutputJson,
  proofOutputToJson,
  proofRequestDataFromJson,
  ProofRequestDataJson,
} from '../proofs/index.js';
import { AztecWalletProvider } from './aztec_wallet_provider.js';
import { BarretenbergWasm, KeyStore } from '../index.js';
import { VanillaAztecWalletProvider } from './vanilla_aztec_wallet_provider.js';

// Wraps VanillaAztecWalletProvider in a JSON-friendly interface
export class AztecWalletProviderServerStub {
  static async new(
    keyStore: KeyStore,
    rollupProvider: RollupProvider,
    wasm: BarretenbergWasm,
    proverless: boolean | undefined = undefined,
  ) {
    if (typeof proverless === 'undefined') {
      proverless = (await rollupProvider.getStatus()).proverless;
    }
    const aztecWalletProvider = await VanillaAztecWalletProvider.new(keyStore, proverless!, rollupProvider, wasm);
    return new AztecWalletProviderServerStub(wasm, aztecWalletProvider);
  }
  constructor(private wasm: BarretenbergWasm, private aztecWalletProvider: AztecWalletProvider) {}
  async connect(permissions?: Permission[] | undefined): Promise<string> {
    return (await this.aztecWalletProvider.connect(permissions)).toString();
  }
  async disconnect(): Promise<void> {
    return await this.aztecWalletProvider.disconnect();
  }
  async getAccountPublicKey(): Promise<string> {
    return (await this.aztecWalletProvider.getAccountPublicKey()).toString();
  }
  async getSpendingPublicKey(): Promise<string> {
    return (await this.aztecWalletProvider.getSpendingPublicKey()).toString();
  }
  async getPermissions(): Promise<Permission[]> {
    return await this.aztecWalletProvider.getPermissions();
  }
  async setPermissions(permission: Permission[]): Promise<void> {
    await this.aztecWalletProvider.setPermissions(permission);
  }
  async signProofs(proofInputs: ProofInputJson[]): Promise<string[]> {
    const signatures = await this.aztecWalletProvider.signProofs(proofInputs.map(proofInputFromJson));
    return signatures.map(s => s.toString());
  }
  async createProofs(proofInputs: ProofInputJson[], signatures: string[]): Promise<ProofOutputJson[]> {
    const proofOutputs = await this.aztecWalletProvider.createProofs(
      proofInputs.map(proofInputFromJson),
      signatures.map(SchnorrSignature.fromString),
    );
    return proofOutputs.map(proofOutputToJson);
  }
  async requestProofInputs(proofRequestData: ProofRequestDataJson): Promise<ProofInputJson[]> {
    const proofInputs = await this.aztecWalletProvider.requestProofInputs(proofRequestDataFromJson(proofRequestData));
    return proofInputs.map(proofInputToJson);
  }
  async requestProofs(proofRequestData: ProofRequestDataJson): Promise<ProofOutputJson[]> {
    const proofOutputs = await this.aztecWalletProvider.requestProofs(proofRequestDataFromJson(proofRequestData));
    return proofOutputs.map(proofOutputToJson);
  }
  async decryptBlocks(from: number, to: number): Promise<DecryptedDataJson> {
    const decryptedData = await this.aztecWalletProvider.decryptBlocks(from, to);
    return decryptedDataToJson(decryptedData);
  }
}

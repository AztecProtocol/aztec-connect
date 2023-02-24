import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { DecryptedData, decryptedDataFromJson, DecryptedDataJson } from '../block_decryptor/block_decryptor.js';
import { Permission } from '../key_store/permission.js';
import {
  ProofInput,
  proofInputFromJson,
  proofInputToJson,
  ProofOutput,
  proofOutputFromJson,
  ProofRequestData,
  proofRequestDataToJson,
} from '../proofs/index.js';
import { AztecWalletProvider } from './aztec_wallet_provider.js';
import { DispatchMsg } from '@aztec/barretenberg/transport';
import { AztecWalletProviderServerStub } from './aztec_wallet_provider_server_stub.js';

export interface TransportClientLike {
  // More minimal interface for testing, fulfilled by TransportClient<DispatchMsg>
  request(payload: DispatchMsg, transfer?: Transferable[]);
}

type AztecWalletParams<K extends keyof AztecWalletProviderServerStub> = Parameters<AztecWalletProviderServerStub[K]>;
type AztecWalletReturn<K extends keyof AztecWalletProviderServerStub> = ReturnType<AztecWalletProviderServerStub[K]>;
export class AztecWalletProviderClientStub implements AztecWalletProvider {
  constructor(private transportClient: TransportClientLike) {}
  private async request<K extends keyof AztecWalletProviderServerStub>(
    fn: K,
    args: AztecWalletParams<K>,
    transfer: Transferable[] = [],
  ): Promise<AztecWalletReturn<K>> {
    const payload = {
      fn: 'walletProviderDispatch',
      args: [{ fn, args }],
    };
    return await this.transportClient.request(payload, transfer);
  }
  async connect(permissions?: Permission[] | undefined): Promise<GrumpkinAddress> {
    const address: string = await this.request('connect', [permissions]);
    return GrumpkinAddress.fromString(address);
  }
  async disconnect(): Promise<void> {
    await this.request('disconnect', []);
  }
  async getAccountPublicKey(): Promise<GrumpkinAddress> {
    const accountPublicKey: string = await this.request('getAccountPublicKey', []);
    return GrumpkinAddress.fromString(accountPublicKey);
  }
  async getSpendingPublicKey(): Promise<GrumpkinAddress> {
    const spendingPublicKey: string = await this.request('getSpendingPublicKey', []);
    return GrumpkinAddress.fromString(spendingPublicKey);
  }
  async getPermissions(): Promise<Permission[]> {
    return await this.request('getPermissions', []);
  }
  async setPermissions(permission: Permission[]): Promise<void> {
    return await this.request('setPermissions', [permission]);
  }
  async signProofs(proofInputs: ProofInput[]): Promise<SchnorrSignature[]> {
    const schnorr: string[] = await this.request('signProofs', [proofInputs.map(proofInputToJson)]);
    return schnorr.map(SchnorrSignature.fromString);
  }
  async createProofs(proofInputs: ProofInput[], signatures: SchnorrSignature[]): Promise<ProofOutput[]> {
    const output = await this.request('createProofs', [
      proofInputs.map(proofInputToJson),
      signatures.map(s => s.toString()),
    ]);
    return output.map(proofOutputFromJson);
  }
  async requestProofInputs(proofRequestData: ProofRequestData): Promise<ProofInput[]> {
    const output = await this.request('requestProofInputs', [proofRequestDataToJson(proofRequestData)]);
    return output.map(proofInputFromJson);
  }
  async requestProofs(proofRequestData: ProofRequestData): Promise<ProofOutput[]> {
    const output = await this.request('requestProofs', [proofRequestDataToJson(proofRequestData)]);
    return output.map(proofOutputFromJson);
  }
  async decryptBlocks(to: number, from: number): Promise<DecryptedData> {
    const decryptedDataJson: DecryptedDataJson = await this.request('decryptBlocks', [to, from]);
    return decryptedDataFromJson(decryptedDataJson);
  }
}

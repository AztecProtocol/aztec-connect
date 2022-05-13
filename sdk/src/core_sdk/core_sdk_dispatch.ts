import { EventEmitter } from 'events';
import { DispatchMsg } from '../core_sdk_flavours/transport';
import { NoteJson } from '../note';
import { AccountProofInputJson, JoinSplitProofInputJson, ProofOutputJson } from '../proofs';
import { CoreSdkOptions } from './core_sdk_options';
import { CoreSdkSerializedInterface } from './core_sdk_serialized_interface';

/**
 * Implements the serialized core sdk interface.
 * Transalates each individual api call, to a DispatchMsg sent to the given handler.
 */
export class CoreSdkDispatch extends EventEmitter implements CoreSdkSerializedInterface {
  constructor(private handler: (msg: DispatchMsg) => Promise<any>) {
    super();
  }

  private async request(fn: string, args: any[] = []) {
    return await this.handler({ fn, args });
  }

  public async init(options: CoreSdkOptions) {
    await this.request('init', [options]);
  }

  public async run() {
    await this.request('run');
  }

  public async destroy() {
    await this.request('destroy');
  }

  public async getLocalStatus() {
    return this.request('getLocalStatus');
  }

  public async getRemoteStatus() {
    return this.request('getRemoteStatus');
  }

  public async getTxFees(assetId: number) {
    return this.request('getTxFees', [assetId]);
  }

  public async getDefiFees(bridgeId: string) {
    return this.request('getDefiFees', [bridgeId]);
  }

  public async getLatestAccountNonce(publicKey: string) {
    return this.request('getLatestAccountNonce', [publicKey]);
  }

  public async getRemoteLatestAccountNonce(publicKey: string) {
    return this.request('getRemoteLatestAccountNonce', [publicKey]);
  }

  public async getLatestAliasNonce(alias: string) {
    return this.request('getLatestAliasNonce', [alias]);
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.request('getRemoteLatestAliasNonce', [alias]);
  }

  public async getAccountId(alias: string, accountNonce?: number) {
    return await this.request('getAccountId', [alias, accountNonce]);
  }

  public async getRemoteAccountId(alias: string, accountNonce?: number) {
    return await this.request('getRemoteAccountId', [alias, accountNonce]);
  }

  public async isAliasAvailable(alias: string) {
    return this.request('isAliasAvailable', [alias]);
  }

  public async isRemoteAliasAvailable(alias: string) {
    return this.request('isRemoteAliasAvailable', [alias]);
  }

  public async computeAliasHash(alias: string) {
    return this.request('computeAliasHash', [alias]);
  }

  public async createPaymentProofInput(
    userId: string,
    assetId: number,
    publicInput: string,
    publicOutput: string,
    privateInput: string,
    recipientPrivateOutput: string,
    senderPrivateOutput: string,
    noteRecipient: string | undefined,
    publicOwner: string | undefined,
    spendingPublicKey: string,
    allowChain: number,
  ) {
    return this.request('createPaymentProofInput', [
      userId,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      noteRecipient,
      publicOwner,
      spendingPublicKey,
      allowChain,
    ]);
  }

  public async createPaymentProof(input: JoinSplitProofInputJson, txRefNo: number) {
    return this.request('createPaymentProof', [input, txRefNo]);
  }

  public async createAccountProofSigningData(
    signingPubKey: string,
    alias: string,
    accountNonce: number,
    migrate: boolean,
    accountPublicKey: string,
    newAccountPublicKey?: string,
    newSigningPubKey1?: string,
    newSigningPubKey2?: string,
  ) {
    return this.request('createAccountProofSigningData', [
      signingPubKey,
      alias,
      accountNonce,
      migrate,
      accountPublicKey,
      newAccountPublicKey,
      newSigningPubKey1,
      newSigningPubKey2,
    ]);
  }

  public async createAccountProofInput(
    userId: string,
    aliasHash: string,
    migrate: boolean,
    signingPublicKey: string,
    newSigningPublicKey1: string | undefined,
    newSigningPublicKey2: string | undefined,
    newAccountPrivateKey: Uint8Array | undefined,
  ) {
    return this.request('createAccountProofInput', [
      userId,
      aliasHash,
      migrate,
      signingPublicKey,
      newSigningPublicKey1,
      newSigningPublicKey2,
      newAccountPrivateKey,
    ]);
  }

  public async createAccountProof(proofInput: AccountProofInputJson, txRefNo: number) {
    return this.request('createAccountProof', [proofInput, txRefNo]);
  }

  public async createDefiProofInput(
    userId: string,
    bridgeId: string,
    depositValue: string,
    inputNotes: NoteJson[],
    spendingPublicKey: string,
  ) {
    return this.request('createDefiProof', [userId, bridgeId, depositValue, inputNotes, spendingPublicKey]);
  }

  public async createDefiProof(input: JoinSplitProofInputJson, txRefNo: number) {
    return this.request('createDefiProof', [input, txRefNo]);
  }

  public async sendProofs(proofs: ProofOutputJson[]) {
    return this.request('sendProofs', [proofs]);
  }

  public async awaitSynchronised() {
    return this.request('awaitSynchronised');
  }

  public isUserSynching(userId: string) {
    return this.request('isUserSynching', [userId]);
  }

  public async awaitUserSynchronised(userId: string) {
    return this.request('awaitUserSynchronised', [userId]);
  }

  public async awaitSettlement(txId: string, timeout?: number) {
    return this.request('awaitSettlement', [txId, timeout]);
  }

  public async awaitDefiDepositCompletion(txId: string, timeout?: number) {
    return this.request('awaitDefiDepositCompletion', [txId, timeout]);
  }

  public async awaitDefiFinalisation(txId: string, timeout?: number) {
    return this.request('awaitDefiFinalisation', [txId, timeout]);
  }

  public async awaitDefiSettlement(txId: string, timeout?: number) {
    return this.request('awaitDefiSettlement', [txId, timeout]);
  }

  public async getDefiInteractionNonce(txId: string) {
    return this.request('getDefiInteractionNonce', [txId]);
  }

  public async userExists(userId: string) {
    return this.request('userExists', [userId]);
  }

  public getUserData(userId: string) {
    return this.request('getUserData', [userId]);
  }

  public getUsersData() {
    return this.request('getUsersData');
  }

  public derivePublicKey(privateKey: Uint8Array) {
    return this.request('derivePublicKey', [privateKey]);
  }

  public async constructSignature(message: Uint8Array, privateKey: Uint8Array) {
    return this.request('constructSignature', [message, privateKey]);
  }

  public async addUser(privateKey: Uint8Array, accountNonce?: number, noSync?: boolean) {
    return this.request('addUser', [privateKey, accountNonce, noSync]);
  }

  public async removeUser(userId: string) {
    return this.request('removeUser', [userId]);
  }

  public async getSigningKeys(accountId: string) {
    return this.request('getSigningKeys', [accountId]);
  }

  public getBalances(userId: string) {
    return this.request('getBalances', [userId]);
  }

  public getBalance(assetId: number, userId: string) {
    return this.request('getBalance', [assetId, userId]);
  }

  public async getSpendableSum(assetId: number, userId: string, excludePendingNotes?: boolean) {
    return this.request('getSpendableSum', [assetId, userId, excludePendingNotes]);
  }

  public async getSpendableSums(userId: string, excludePendingNotes?: boolean) {
    return this.request('getSpendableSums', [userId, excludePendingNotes]);
  }

  public async getMaxSpendableValue(assetId: number, userId: string, numNotes?: number, excludePendingNotes?: boolean) {
    return this.request('getMaxSpendableValue', [assetId, userId, numNotes, excludePendingNotes]);
  }

  public async pickNotes(userId: string, assetId: number, value: string, excludePendingNotes?: boolean) {
    return this.request('pickNotes', [userId, assetId, value, excludePendingNotes]);
  }

  public async pickNote(userId: string, assetId: number, value: string, excludePendingNotes?: boolean) {
    return this.request('pickNote', [userId, assetId, value, excludePendingNotes]);
  }

  public async getUserTxs(userId: string) {
    return this.request('getUserTxs', [userId]);
  }

  public async getRemoteUnsettledAccountTxs() {
    return this.request('getRemoteUnsettledAccountTxs');
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.request('getRemoteUnsettledPaymentTxs');
  }
}

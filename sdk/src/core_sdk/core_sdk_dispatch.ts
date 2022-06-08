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

  public async isAccountRegistered(accountPublicKey: string) {
    return this.request('isAccountRegistered', [accountPublicKey]);
  }

  public async isRemoteAccountRegistered(accountPublicKey: string) {
    return this.request('isRemoteAccountRegistered', [accountPublicKey]);
  }

  public async isAliasRegistered(alias: string) {
    return this.request('isAliasRegistered', [alias]);
  }

  public async isRemoteAliasRegistered(alias: string) {
    return this.request('isRemoteAliasRegistered', [alias]);
  }

  public async accountExists(accountPublicKey: string, alias: string) {
    return this.request('accountExists', [accountPublicKey, alias]);
  }

  public async remoteAccountExists(accountPublicKey: string, alias: string) {
    return this.request('remoteAccountExists', [accountPublicKey, alias]);
  }

  public async getAccountPublicKey(alias: string) {
    return this.request('getAccountPublicKey', [alias]);
  }

  public async getRemoteUnsettledAccountPublicKey(alias: string) {
    return this.request('getRemoteUnsettledAccountPublicKey', [alias]);
  }

  public async getTxFees(assetId: number) {
    return this.request('getTxFees', [assetId]);
  }

  public async getDefiFees(bridgeId: string) {
    return this.request('getDefiFees', [bridgeId]);
  }

  public async createDepositProof(
    assetId: number,
    publicInput: string,
    privateOutput: string,
    depositor: string,
    recipient: string,
    recipientAccountRequired: boolean,
    txRefNo: number,
  ) {
    return this.request('createDepositProof', [
      assetId,
      publicInput,
      privateOutput,
      depositor,
      recipient,
      recipientAccountRequired,
      txRefNo,
    ]);
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
    recipientAccountRequired: boolean,
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
      recipientAccountRequired,
      publicOwner,
      spendingPublicKey,
      allowChain,
    ]);
  }

  public async createPaymentProof(input: JoinSplitProofInputJson, txRefNo: number) {
    return this.request('createPaymentProof', [input, txRefNo]);
  }

  public async createAccountProofSigningData(
    accountPublicKey: string,
    alias: string,
    migrate: boolean,
    spendingPublicKey: string,
    newAccountPublicKey?: string,
    newSpendingPublicKey1?: string,
    newSpendingPublicKey2?: string,
  ) {
    return this.request('createAccountProofSigningData', [
      accountPublicKey,
      alias,
      migrate,
      spendingPublicKey,
      newAccountPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
    ]);
  }

  public async createAccountProofInput(
    userId: string,
    alias: string,
    migrate: boolean,
    spendingPublicKey: string,
    newSpendingPublicKey1: string | undefined,
    newSpendingPublicKey2: string | undefined,
    newAccountPrivateKey: Uint8Array | undefined,
  ) {
    return this.request('createAccountProofInput', [
      userId,
      alias,
      migrate,
      spendingPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
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
    return this.request('createDefiProofInput', [userId, bridgeId, depositValue, inputNotes, spendingPublicKey]);
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

  public async isUserSynching(userId: string) {
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

  public async addUser(privateKey: Uint8Array, noSync?: boolean) {
    return this.request('addUser', [privateKey, noSync]);
  }

  public async removeUser(userId: string) {
    return this.request('removeUser', [userId]);
  }

  public async getSpendingKeys(userId: string) {
    return this.request('getSpendingKeys', [userId]);
  }

  public getBalances(userId: string, unsafe?: boolean) {
    return this.request('getBalances', [userId, unsafe]);
  }

  public getBalance(userId: string, assetId: number, unsafe?: boolean) {
    return this.request('getBalance', [userId, assetId, unsafe]);
  }

  public async getSpendableSum(userId: string, assetId: number, excludePendingNotes?: boolean, unsafe?: boolean) {
    return this.request('getSpendableSum', [userId, assetId, excludePendingNotes, unsafe]);
  }

  public async getSpendableSums(userId: string, excludePendingNotes?: boolean, unsafe?: boolean) {
    return this.request('getSpendableSums', [userId, excludePendingNotes, unsafe]);
  }

  public async getMaxSpendableValue(
    userId: string,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return this.request('getMaxSpendableValue', [userId, assetId, numNotes, excludePendingNotes, unsafe]);
  }

  public async pickNotes(
    userId: string,
    assetId: number,
    value: string,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return this.request('pickNotes', [userId, assetId, value, excludePendingNotes, unsafe]);
  }

  public async pickNote(
    userId: string,
    assetId: number,
    value: string,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return this.request('pickNote', [userId, assetId, value, excludePendingNotes, unsafe]);
  }

  public async getUserTxs(userId: string) {
    return this.request('getUserTxs', [userId]);
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.request('getRemoteUnsettledPaymentTxs');
  }
}

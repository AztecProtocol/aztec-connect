import { TxJson } from '@aztec/barretenberg/rollup_provider';
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
    return await this.request('getLocalStatus');
  }

  public async getRemoteStatus() {
    return await this.request('getRemoteStatus');
  }

  public async isAccountRegistered(accountPublicKey: string, includePending: boolean) {
    return await this.request('isAccountRegistered', [accountPublicKey, includePending]);
  }

  public async isAliasRegistered(alias: string, includePending: boolean) {
    return await this.request('isAliasRegistered', [alias, includePending]);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: string, alias: string, includePending: boolean) {
    return await this.request('isAliasRegisteredToAccount', [accountPublicKey, alias, includePending]);
  }

  public async getAccountPublicKey(alias: string) {
    return await this.request('getAccountPublicKey', [alias]);
  }

  public async getTxFees(assetId: number) {
    return await this.request('getTxFees', [assetId]);
  }

  public async getDefiFees(bridgeCallData: string) {
    return await this.request('getDefiFees', [bridgeCallData]);
  }

  public async getPendingDepositTxs() {
    return await this.request('getPendingDepositTxs');
  }

  public async createDepositProof(
    assetId: number,
    publicInput: string,
    privateOutput: string,
    depositor: string,
    recipient: string,
    recipientSpendingKeyRequired: boolean,
    txRefNo: number,
  ) {
    return await this.request('createDepositProof', [
      assetId,
      publicInput,
      privateOutput,
      depositor,
      recipient,
      recipientSpendingKeyRequired,
      txRefNo,
    ]);
  }

  public async createPaymentProofInputs(
    userId: string,
    assetId: number,
    publicInput: string,
    publicOutput: string,
    privateInput: string,
    recipientPrivateOutput: string,
    senderPrivateOutput: string,
    noteRecipient: string | undefined,
    recipientSpendingKeyRequired: boolean,
    publicOwner: string | undefined,
    spendingPublicKey: string,
    allowChain: number,
  ) {
    return await this.request('createPaymentProofInputs', [
      userId,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      noteRecipient,
      recipientSpendingKeyRequired,
      publicOwner,
      spendingPublicKey,
      allowChain,
    ]);
  }

  public async createPaymentProof(input: JoinSplitProofInputJson, txRefNo: number) {
    return await this.request('createPaymentProof', [input, txRefNo]);
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
    return await this.request('createAccountProofSigningData', [
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
    spendingPublicKey: string,
    migrate: boolean,
    newAlias: string,
    newSpendingPublicKey1: string | undefined,
    newSpendingPublicKey2: string | undefined,
    newAccountPrivateKey: Uint8Array | undefined,
  ) {
    return await this.request('createAccountProofInput', [
      userId,
      spendingPublicKey,
      migrate,
      newAlias,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
      newAccountPrivateKey,
    ]);
  }

  public async createAccountProof(proofInput: AccountProofInputJson, txRefNo: number) {
    return await this.request('createAccountProof', [proofInput, txRefNo]);
  }

  public async createDefiProofInput(
    userId: string,
    bridgeCallData: string,
    depositValue: string,
    inputNotes: NoteJson[],
    spendingPublicKey: string,
  ) {
    return await this.request('createDefiProofInput', [
      userId,
      bridgeCallData,
      depositValue,
      inputNotes,
      spendingPublicKey,
    ]);
  }

  public async createDefiProof(input: JoinSplitProofInputJson, txRefNo: number) {
    return await this.request('createDefiProof', [input, txRefNo]);
  }

  public async sendProofs(proofs: ProofOutputJson[], proofTxs: TxJson[] = []) {
    return await this.request('sendProofs', [proofs, proofTxs]);
  }

  public async awaitSynchronised(timeout?: number) {
    return await this.request('awaitSynchronised', [timeout]);
  }

  public async isUserSynching(userId: string) {
    return await this.request('isUserSynching', [userId]);
  }

  public async awaitUserSynchronised(userId: string, timeout?: number) {
    return await this.request('awaitUserSynchronised', [userId, timeout]);
  }

  public async awaitSettlement(txId: string, timeout?: number) {
    return await this.request('awaitSettlement', [txId, timeout]);
  }

  public async awaitDefiDepositCompletion(txId: string, timeout?: number) {
    return await this.request('awaitDefiDepositCompletion', [txId, timeout]);
  }

  public async awaitDefiFinalisation(txId: string, timeout?: number) {
    return await this.request('awaitDefiFinalisation', [txId, timeout]);
  }

  public async awaitDefiSettlement(txId: string, timeout?: number) {
    return await this.request('awaitDefiSettlement', [txId, timeout]);
  }

  public async getDefiInteractionNonce(txId: string) {
    return await this.request('getDefiInteractionNonce', [txId]);
  }

  public async userExists(userId: string) {
    return await this.request('userExists', [userId]);
  }

  public getUsers() {
    return this.request('getUsers');
  }

  public derivePublicKey(privateKey: Uint8Array) {
    return this.request('derivePublicKey', [privateKey]);
  }

  public async constructSignature(message: Uint8Array, privateKey: Uint8Array) {
    return await this.request('constructSignature', [message, privateKey]);
  }

  public async addUser(accountPrivateKey: Uint8Array, noSync?: boolean) {
    return await this.request('addUser', [accountPrivateKey, noSync]);
  }

  public async removeUser(userId: string) {
    return await this.request('removeUser', [userId]);
  }

  public async getUserSyncedToRollup(userId: string) {
    return await this.request('getUserSyncedToRollup', [userId]);
  }

  public async getSpendingKeys(userId: string) {
    return await this.request('getSpendingKeys', [userId]);
  }

  public async getBalances(userId: string) {
    return await this.request('getBalances', [userId]);
  }

  public async getBalance(userId: string, assetId: number) {
    return await this.request('getBalance', [userId, assetId]);
  }

  public async getSpendableNoteValues(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.request('getSpendableNoteValues', [userId, assetId, spendingKeyRequired, excludePendingNotes]);
  }

  public async getSpendableSum(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.request('getSpendableSum', [userId, assetId, spendingKeyRequired, excludePendingNotes]);
  }

  public async getSpendableSums(userId: string, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    return await this.request('getSpendableSums', [userId, spendingKeyRequired, excludePendingNotes]);
  }

  public async getMaxSpendableNoteValues(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    return await this.request('getMaxSpendableNoteValues', [
      userId,
      assetId,
      spendingKeyRequired,
      excludePendingNotes,
      numNotes,
    ]);
  }

  public async pickNotes(
    userId: string,
    assetId: number,
    value: string,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.request('pickNotes', [userId, assetId, value, spendingKeyRequired, excludePendingNotes]);
  }

  public async pickNote(
    userId: string,
    assetId: number,
    value: string,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.request('pickNote', [userId, assetId, value, spendingKeyRequired, excludePendingNotes]);
  }

  public async getUserTxs(userId: string) {
    return await this.request('getUserTxs', [userId]);
  }
}

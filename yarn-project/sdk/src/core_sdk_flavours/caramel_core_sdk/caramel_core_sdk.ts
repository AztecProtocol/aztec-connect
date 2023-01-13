import { BridgePublishQuery, BridgePublishQueryResult, TxJson } from '@aztec/barretenberg/rollup_provider';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { CoreSdkOptions, CoreSdkSerializedInterface, CoreSdkServerStub, SdkEvent } from '../../core_sdk/index.js';
import {
  accountProofInputFromJson,
  AccountProofInputJson,
  joinSplitProofInputFromJson,
  JoinSplitProofInputJson,
  ProofOutputJson,
} from '../../proofs/index.js';
import { MemorySerialQueue } from '../../serial_queue/index.js';

/**
 * Implements the standard CoreSdkSerializedInterface.
 * Check permission for apis that access user data.
 * If permission has been granted for the origin, it then forwards the calls onto a CoreSdkServerStub.
 */
export class CaramelCoreSdk extends EventEmitter implements CoreSdkSerializedInterface {
  private serialQueue = new MemorySerialQueue();

  constructor(private core: CoreSdkServerStub, private origin: string, private leveldb: LevelUp) {
    super();

    // Broadcast all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }
  }

  public async init(options: CoreSdkOptions) {
    await this.core.init(options);
  }

  public async run() {
    await this.core.run();
  }

  public async destroy() {
    await this.core.destroy();
    await this.leveldb.close();
  }

  public async getLocalStatus() {
    return await this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return await this.core.getRemoteStatus();
  }

  public async sendConsoleLog(clientData?: string[], preserveLog?: boolean) {
    return await this.core.sendConsoleLog(clientData, preserveLog);
  }

  public async isAccountRegistered(accountPublicKey: string, includePending: boolean) {
    return await this.core.isAccountRegistered(accountPublicKey, includePending);
  }

  public async isAliasRegistered(alias: string, includePending: boolean) {
    return await this.core.isAliasRegistered(alias, includePending);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: string, alias: string, includePending: boolean) {
    return await this.core.isAliasRegisteredToAccount(accountPublicKey, alias, includePending);
  }

  public async getAccountPublicKey(alias: string) {
    const key = await this.core.getAccountPublicKey(alias);
    return key?.toString();
  }

  public async getTxFees(assetId: number) {
    return await this.core.getTxFees(assetId);
  }

  public async getDefiFees(bridgeCallData: string) {
    return await this.core.getDefiFees(bridgeCallData);
  }

  public async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    return await this.core.queryDefiPublishStats(query);
  }

  public async getPendingDepositTxs() {
    return await this.core.getPendingDepositTxs();
  }

  public async createDepositProof(
    assetId: number,
    publicInput: string,
    privateOutput: string,
    depositor: string,
    recipient: string,
    recipientSpendingKeyRequired: boolean,
    txRefNo: number,
    timeout?: number,
  ) {
    return await this.core.createDepositProof(
      assetId,
      publicInput,
      privateOutput,
      depositor,
      recipient,
      recipientSpendingKeyRequired,
      txRefNo,
      timeout,
    );
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
    await this.checkPermission(userId);
    return await this.core.createPaymentProofInputs(
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
    );
  }

  public async createPaymentProof(input: JoinSplitProofInputJson, txRefNo: number, timeout?: number) {
    const {
      tx: { outputNotes },
    } = joinSplitProofInputFromJson(input);
    const userId = outputNotes[1].ownerPubKey;
    await this.checkPermission(userId.toString());
    return this.core.createPaymentProof(input, txRefNo, timeout);
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
    return await this.core.createAccountProofSigningData(
      accountPublicKey,
      alias,
      migrate,
      spendingPublicKey,
      newAccountPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
    );
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
    await this.checkPermission(userId);
    return this.core.createAccountProofInput(
      userId,
      alias,
      migrate,
      spendingPublicKey,
      newSpendingPublicKey1,
      newSpendingPublicKey2,
      newAccountPrivateKey,
    );
  }

  public async createAccountProof(input: AccountProofInputJson, txRefNo: number, timeout?: number) {
    const {
      tx: { accountPublicKey },
    } = accountProofInputFromJson(input);
    await this.checkPermission(accountPublicKey.toString());
    return this.core.createAccountProof(input, txRefNo, timeout);
  }

  public async createDefiProofInput(
    userId: string,
    bridgeCallData: string,
    depositValue: string,
    fee: string,
    spendingPublicKey: string,
  ) {
    await this.checkPermission(userId);
    return this.core.createDefiProofInput(userId, bridgeCallData, depositValue, fee, spendingPublicKey);
  }

  public async createDefiProof(input: JoinSplitProofInputJson, txRefNo: number, timeout?: number) {
    const {
      tx: { outputNotes },
    } = joinSplitProofInputFromJson(input);
    const userId = outputNotes[1].ownerPubKey;
    await this.checkPermission(userId.toString());
    return this.core.createDefiProof(input, txRefNo, timeout);
  }

  public async sendProofs(proofs: ProofOutputJson[], proofTxs: TxJson[] = []) {
    return await this.core.sendProofs(proofs, proofTxs);
  }

  public async awaitSynchronised(timeout?: number) {
    await this.core.awaitSynchronised(timeout);
  }

  public async isUserSynching(userId: string) {
    await this.checkPermission(userId);
    return this.core.isUserSynching(userId);
  }

  public async awaitUserSynchronised(userId: string, timeout?: number) {
    await this.checkPermission(userId);
    await this.core.awaitUserSynchronised(userId, timeout);
  }

  public async awaitSettlement(txId: string, timeout?: number) {
    await this.core.awaitSettlement(txId, timeout);
  }

  public async awaitDefiDepositCompletion(txId: string, timeout?: number) {
    await this.core.awaitDefiDepositCompletion(txId, timeout);
  }

  public async awaitDefiFinalisation(txId: string, timeout?: number) {
    await this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitDefiSettlement(txId: string, timeout?: number) {
    await this.core.awaitDefiSettlement(txId, timeout);
  }

  public async getDefiInteractionNonce(txId: string) {
    return await this.core.getDefiInteractionNonce(txId);
  }

  public async userExists(userId: string) {
    return (await this.hasPermission(userId)) && (await this.core.userExists(userId));
  }

  public async getUsers() {
    const accountPublicKeys = await this.core.getUsers();
    const permissions = await Promise.all(accountPublicKeys.map(pk => this.hasPermission(pk)));
    return accountPublicKeys.filter((_, i) => permissions[i]);
  }

  public async derivePublicKey(privateKey: Uint8Array) {
    return await this.core.derivePublicKey(privateKey);
  }

  public async constructSignature(message: Uint8Array, privateKey: Uint8Array) {
    return await this.core.constructSignature(message, privateKey);
  }

  public async addUser(accountPrivateKey: Uint8Array, noSync?: boolean) {
    return await this.serialQueue.push(async () => {
      let addUserError: Error;
      try {
        const accountPublicKey = await this.core.addUser(accountPrivateKey, noSync);
        await this.addPermission(accountPublicKey);
        return accountPublicKey;
      } catch (e: any) {
        // User probably already exists.
        addUserError = e;
      }

      // Get user data.
      // It will throw if the user doesn't exist, which means something went wrong while calling core.addUser().
      const userId = await this.core.derivePublicKey(accountPrivateKey);
      if (!(await this.core.userExists(userId))) {
        throw addUserError;
      }

      await this.addPermission(userId);
      return userId;
    });
  }

  public async removeUser(userId: string) {
    return await this.serialQueue.push(async () => {
      await this.checkPermission(userId);
      const domains = await this.getUserDomains(userId);
      if (domains.length === 1) {
        await this.core.removeUser(userId);
      }
      await this.removePermission(userId);
    });
  }

  public async getUserSyncedToRollup(userId: string) {
    await this.checkPermission(userId);
    return this.core.getUserSyncedToRollup(userId);
  }

  public async getSpendingKeys(userId: string) {
    await this.checkPermission(userId);
    return this.core.getSpendingKeys(userId);
  }

  public async getBalances(userId: string) {
    await this.checkPermission(userId);
    return this.core.getBalances(userId);
  }

  public async getBalance(userId: string, assetId: number) {
    await this.checkPermission(userId);
    return this.core.getBalance(userId, assetId);
  }

  public async getSpendableNoteValues(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    await this.checkPermission(userId);
    return this.core.getSpendableNoteValues(userId, assetId, spendingKeyRequired, excludePendingNotes);
  }

  public async getSpendableSum(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    await this.checkPermission(userId);
    return this.core.getSpendableSum(userId, assetId, spendingKeyRequired, excludePendingNotes);
  }

  public async getSpendableSums(userId: string, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    await this.checkPermission(userId);
    return this.core.getSpendableSums(userId, spendingKeyRequired, excludePendingNotes);
  }

  public async getMaxSpendableNoteValues(
    userId: string,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    await this.checkPermission(userId);
    return this.core.getMaxSpendableNoteValues(userId, assetId, spendingKeyRequired, excludePendingNotes, numNotes);
  }

  public async pickNotes(
    userId: string,
    assetId: number,
    value: string,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    await this.checkPermission(userId);
    return this.core.pickNotes(userId, assetId, value, spendingKeyRequired, excludePendingNotes);
  }

  public async pickNote(
    userId: string,
    assetId: number,
    value: string,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    await this.checkPermission(userId);
    return this.core.pickNote(userId, assetId, value, spendingKeyRequired, excludePendingNotes);
  }

  public async getUserTxs(userId: string) {
    await this.checkPermission(userId);
    return this.core.getUserTxs(userId);
  }

  private async checkPermission(userId: string) {
    if (!(await this.hasPermission(userId))) {
      throw new Error(`User not permitted: ${userId}`);
    }
  }

  private async hasPermission(userId: string): Promise<boolean> {
    const domains = await this.getUserDomains(userId);
    return domains.includes(this.origin);
  }

  private async addPermission(userId: string) {
    const domains = await this.getUserDomains(userId);
    await this.updateUserDomains(userId, [...domains, this.origin]);
  }

  private async removePermission(userId: string) {
    const domains = (await this.getUserDomains(userId)).filter(d => d !== this.origin);
    await this.updateUserDomains(userId, domains);
  }

  private async updateUserDomains(userId: string, domains: string[]) {
    await this.leveldb.put(userId, Buffer.from(JSON.stringify(domains)));
  }

  private async getUserDomains(userId: string): Promise<string[]> {
    return await this.leveldb
      .get(userId)
      .then(buf => JSON.parse(buf.toString()))
      .catch(() => []);
  }
}

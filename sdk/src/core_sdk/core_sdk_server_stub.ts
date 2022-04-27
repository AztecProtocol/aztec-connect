import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { assetValueToJson } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { accountTxToJson, joinSplitTxToJson, rollupProviderStatusToJson } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { EventEmitter } from 'events';
import { coreUserTxToJson } from '../core_tx';
import { noteFromJson, NoteJson, noteToJson } from '../note';
import {
  accountProofInputFromJson,
  AccountProofInputJson,
  accountProofInputToJson,
  joinSplitProofInputFromJson,
  JoinSplitProofInputJson,
  joinSplitProofInputToJson,
  proofOutputFromJson,
  ProofOutputJson,
  proofOutputToJson,
} from '../proofs';
import { userDataToJson } from '../user';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, sdkStatusToJson } from './sdk_status';

/**
 * Implements the standard CoreSdkSerializedInterface (actually the interface is derived from this, but same thing).
 * Translates the CoreSdkSerializedInterface from serial types such as string, UInt8Array into normal types such
 * as bigint, Buffer etc.
 * It forwards the calls onto an implementation of CoreSdkInterface.
 */
export class CoreSdkServerStub {
  private eventDelegator = new EventEmitter();

  constructor(private core: CoreSdkInterface) {
    // Broadcast all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => {
        switch (event) {
          case SdkEvent.UPDATED_USER_STATE: {
            const [userId] = args;
            this.eventDelegator.emit(event, userId.toString());
            break;
          }
          default:
            this.eventDelegator.emit(event, ...args);
        }
      });
    }
  }

  public async init(options: CoreSdkOptions) {
    await this.core.init(options);
  }

  public on(event: SdkEvent, listener: (...args: any[]) => void) {
    this.eventDelegator.on(event, listener);
  }

  public async run() {
    await this.core.run();
  }

  public async destroy() {
    await this.core.destroy();
  }

  public async getLocalStatus() {
    const status = await this.core.getLocalStatus();
    return sdkStatusToJson(status);
  }

  public async getRemoteStatus() {
    const status = await this.core.getRemoteStatus();
    return rollupProviderStatusToJson(status);
  }

  public async getTxFees(assetId: number) {
    const txFees = await this.core.getTxFees(assetId);
    return txFees.map(fees => fees.map(assetValueToJson));
  }

  public async getDefiFees(bridgeId: string) {
    const fees = await this.core.getDefiFees(BridgeId.fromString(bridgeId));
    return fees.map(assetValueToJson);
  }

  public async getLatestAccountNonce(publicKey: string) {
    return this.core.getLatestAccountNonce(GrumpkinAddress.fromString(publicKey));
  }

  public async getRemoteLatestAccountNonce(publicKey: string) {
    return this.core.getLatestAccountNonce(GrumpkinAddress.fromString(publicKey));
  }

  public async getLatestAliasNonce(alias: string) {
    return this.core.getLatestAliasNonce(alias);
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.core.getRemoteLatestAliasNonce(alias);
  }

  public async getAccountId(alias: string, nonce?: number) {
    const accountId = await this.core.getAccountId(alias, nonce);
    return accountId ? accountId.toString() : undefined;
  }

  public async getRemoteAccountId(alias: string, nonce?: number) {
    const accountId = await this.core.getRemoteAccountId(alias, nonce);
    return accountId ? accountId.toString() : undefined;
  }

  public async isAliasAvailable(alias: string) {
    return this.core.isAliasAvailable(alias);
  }

  public async isRemoteAliasAvailable(alias: string) {
    return this.core.isRemoteAliasAvailable(alias);
  }

  public async computeAliasHash(alias: string) {
    return (await this.core.computeAliasHash(alias)).toString();
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
    const proofInput = await this.core.createPaymentProofInput(
      AccountId.fromString(userId),
      assetId,
      BigInt(publicInput),
      BigInt(publicOutput),
      BigInt(privateInput),
      BigInt(recipientPrivateOutput),
      BigInt(senderPrivateOutput),
      noteRecipient ? AccountId.fromString(noteRecipient) : undefined,
      publicOwner ? EthAddress.fromString(publicOwner) : undefined,
      GrumpkinAddress.fromString(spendingPublicKey),
      allowChain,
    );
    return joinSplitProofInputToJson(proofInput);
  }

  public async createPaymentProof(input: JoinSplitProofInputJson, txRefNo: number) {
    const proofOutput = await this.core.createPaymentProof(joinSplitProofInputFromJson(input), txRefNo);
    return proofOutputToJson(proofOutput);
  }

  public async createAccountProofSigningData(
    signingPubKey: string,
    alias: string,
    nonce: number,
    migrate: boolean,
    accountPublicKey: string,
    newAccountPublicKey?: string,
    newSigningPubKey1?: string,
    newSigningPubKey2?: string,
  ) {
    const signingData = await this.core.createAccountProofSigningData(
      GrumpkinAddress.fromString(signingPubKey),
      alias,
      nonce,
      migrate,
      GrumpkinAddress.fromString(accountPublicKey),
      newAccountPublicKey ? GrumpkinAddress.fromString(newAccountPublicKey) : undefined,
      newSigningPubKey1 ? GrumpkinAddress.fromString(newSigningPubKey1) : undefined,
      newSigningPubKey2 ? GrumpkinAddress.fromString(newSigningPubKey2) : undefined,
    );
    return new Uint8Array(signingData);
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
    const proofInput = await this.core.createAccountProofInput(
      AccountId.fromString(userId),
      AliasHash.fromString(aliasHash),
      migrate,
      GrumpkinAddress.fromString(signingPublicKey),
      newSigningPublicKey1 ? GrumpkinAddress.fromString(newSigningPublicKey1) : undefined,
      newSigningPublicKey2 ? GrumpkinAddress.fromString(newSigningPublicKey2) : undefined,
      newAccountPrivateKey ? Buffer.from(newAccountPrivateKey) : undefined,
    );
    return accountProofInputToJson(proofInput);
  }

  public async createAccountProof(proofInput: AccountProofInputJson, txRefNo: number) {
    const proofOutput = await this.core.createAccountProof(accountProofInputFromJson(proofInput), txRefNo);
    return proofOutputToJson(proofOutput);
  }

  public async createDefiProofInput(
    userId: string,
    bridgeId: string,
    depositValue: string,
    inputNotes: NoteJson[],
    spendingPublicKey: string,
  ) {
    const proofInput = await this.core.createDefiProofInput(
      AccountId.fromString(userId),
      BridgeId.fromString(bridgeId),
      BigInt(depositValue),
      inputNotes.map(n => noteFromJson(n)),
      GrumpkinAddress.fromString(spendingPublicKey),
    );
    return joinSplitProofInputToJson(proofInput);
  }

  public async createDefiProof(input: JoinSplitProofInputJson, txRefNo: number) {
    const proofOutput = await this.core.createDefiProof(joinSplitProofInputFromJson(input), txRefNo);
    return proofOutputToJson(proofOutput);
  }

  public async sendProofs(proofs: ProofOutputJson[]) {
    const txIds = await this.core.sendProofs(proofs.map(proofOutputFromJson));
    return txIds.map(txId => txId.toString());
  }

  public async awaitSynchronised() {
    await this.core.awaitSynchronised();
  }

  public isUserSynching(userId: string) {
    return this.core.isUserSynching(AccountId.fromString(userId));
  }

  public async awaitUserSynchronised(userId: string) {
    await this.core.awaitUserSynchronised(AccountId.fromString(userId));
  }

  public async awaitSettlement(txId: string, timeout?: number) {
    await this.core.awaitSettlement(TxId.fromString(txId), timeout);
  }

  public async awaitDefiDepositCompletion(txId: string, timeout?: number) {
    await this.core.awaitDefiDepositCompletion(TxId.fromString(txId), timeout);
  }

  public async awaitDefiFinalisation(txId: string, timeout?: number) {
    await this.core.awaitDefiFinalisation(TxId.fromString(txId), timeout);
  }

  public async awaitDefiSettlement(txId: string, timeout?: number) {
    await this.core.awaitDefiSettlement(TxId.fromString(txId), timeout);
  }

  public async getDefiInteractionNonce(txId: string) {
    return this.core.getDefiInteractionNonce(TxId.fromString(txId));
  }

  public async userExists(userId: string) {
    return this.core.userExists(AccountId.fromString(userId));
  }

  public async getUserData(userId: string) {
    const userData = await this.core.getUserData(AccountId.fromString(userId));
    return userDataToJson(userData);
  }

  public async getUsersData() {
    const usersData = await this.core.getUsersData();
    return usersData.map(userDataToJson);
  }

  public async derivePublicKey(privateKey: Uint8Array) {
    const publicKey = await this.core.derivePublicKey(Buffer.from(privateKey));
    return publicKey.toString();
  }

  public async constructSignature(message: Uint8Array, privateKey: Uint8Array) {
    const signature = await this.core.constructSignature(Buffer.from(message), Buffer.from(privateKey));
    return signature.toString();
  }

  public async addUser(privateKey: Uint8Array, nonce?: number, noSync?: boolean) {
    const userData = await this.core.addUser(Buffer.from(privateKey), nonce, noSync);
    return userDataToJson(userData);
  }

  public async removeUser(userId: string) {
    await this.core.removeUser(AccountId.fromString(userId));
  }

  public async getSigningKeys(accountId: string) {
    const keys = await this.core.getSigningKeys(AccountId.fromString(accountId));
    return keys.map(k => new Uint8Array(k));
  }

  public async getBalances(userId: string) {
    const balances = await this.core.getBalances(AccountId.fromString(userId));
    return balances.map(assetValueToJson);
  }

  public async getBalance(assetId: number, userId: string) {
    const balance = await this.core.getBalance(assetId, AccountId.fromString(userId));
    return balance.toString();
  }

  public async getMaxSpendableValue(assetId: number, userId: string, numNotes?: number) {
    const value = await this.core.getMaxSpendableValue(assetId, AccountId.fromString(userId), numNotes);
    return value.toString();
  }

  public async getSpendableNotes(assetId: number, userId: string) {
    const notes = await this.core.getSpendableNotes(assetId, AccountId.fromString(userId));
    return notes.map(noteToJson);
  }

  public async getSpendableSum(assetId: number, userId: string) {
    const sum = await this.core.getSpendableSum(assetId, AccountId.fromString(userId));
    return sum.toString();
  }

  public async getSpendableSums(userId: string) {
    const sums = await this.core.getSpendableSums(AccountId.fromString(userId));
    return sums.map(assetValueToJson);
  }

  public async getNotes(userId: string) {
    const notes = await this.core.getNotes(AccountId.fromString(userId));
    return notes.map(noteToJson);
  }

  public async pickNotes(userId: string, assetId: number, value: string) {
    return (await this.core.pickNotes(AccountId.fromString(userId), assetId, BigInt(value))).map(noteToJson);
  }

  public async pickNote(userId: string, assetId: number, value: string) {
    const note = await this.core.pickNote(AccountId.fromString(userId), assetId, BigInt(value));
    return note ? noteToJson(note) : undefined;
  }

  public async getUserTxs(userId: string) {
    const txs = await this.core.getUserTxs(AccountId.fromString(userId));
    return txs.map(coreUserTxToJson);
  }

  public async getRemoteUnsettledAccountTxs() {
    const txs = await this.core.getRemoteUnsettledAccountTxs();
    return txs.map(accountTxToJson);
  }

  public async getRemoteUnsettledPaymentTxs() {
    const txs = await this.core.getRemoteUnsettledPaymentTxs();
    return txs.map(joinSplitTxToJson);
  }
}

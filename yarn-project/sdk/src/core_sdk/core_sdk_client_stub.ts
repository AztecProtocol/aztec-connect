import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { assetValueFromJson } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import {
  BridgePublishQuery,
  BridgePublishQueryResult,
  depositTxFromJson,
  rollupProviderStatusFromJson,
  Tx,
  txToJson,
} from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import EventEmitter from 'events';
import { coreUserTxFromJson } from '../core_tx/index.js';
import { noteFromJson } from '../note/index.js';
import {
  AccountProofInput,
  accountProofInputFromJson,
  accountProofInputToJson,
  JoinSplitProofInput,
  joinSplitProofInputFromJson,
  joinSplitProofInputToJson,
  ProofOutput,
  proofOutputFromJson,
  proofOutputToJson,
} from '../proofs/index.js';
import { CoreSdkInterface } from './core_sdk_interface.js';
import { CoreSdkOptions } from './core_sdk_options.js';
import { CoreSdkSerializedInterface } from './core_sdk_serialized_interface.js';
import { SdkEvent, sdkStatusFromJson } from './sdk_status.js';

/**
 * Implements the standard CoreSdkInterface.
 * Translates the CoreSdkInterface from normal types such as bigint, Buffer, GrumpkinAddress, etc. into types
 * that can be serialized over a MessageChannel.
 * It forwards the calls onto an implementation of CoreSdkSerializedInterface.
 */
export class CoreSdkClientStub extends EventEmitter implements CoreSdkInterface {
  constructor(private backend: CoreSdkSerializedInterface) {
    super();

    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.backend.on(event, (...args: any[]) => {
        switch (event) {
          case SdkEvent.UPDATED_USER_STATE: {
            const [userId] = args;
            this.emit(event, GrumpkinAddress.fromString(userId));
            break;
          }
          default:
            this.emit(event, ...args);
        }
      });
    }
  }

  public async init(options: CoreSdkOptions) {
    await this.backend.init(options);
  }

  public async run() {
    await this.backend.run();
  }

  public async destroy() {
    await this.backend.destroy();
  }

  public async getLocalStatus() {
    const json = await this.backend.getLocalStatus();
    return sdkStatusFromJson(json);
  }

  public async getRemoteStatus() {
    const json = await this.backend.getRemoteStatus();
    return rollupProviderStatusFromJson(json);
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress, includePending: boolean) {
    return await this.backend.isAccountRegistered(accountPublicKey.toString(), includePending);
  }

  public async isAliasRegistered(alias: string, includePending: boolean) {
    return await this.backend.isAliasRegistered(alias, includePending);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string, includePending: boolean) {
    return await this.backend.isAliasRegisteredToAccount(accountPublicKey.toString(), alias, includePending);
  }

  public async getAccountPublicKey(alias: string) {
    const key = await this.backend.getAccountPublicKey(alias);
    return key ? GrumpkinAddress.fromString(key) : undefined;
  }

  public async getTxFees(assetId: number) {
    const txFees = await this.backend.getTxFees(assetId);
    return txFees.map(fees => fees.map(assetValueFromJson));
  }

  public async getDefiFees(bridgeCallData: BridgeCallData) {
    const fees = await this.backend.getDefiFees(bridgeCallData.toString());
    return fees.map(assetValueFromJson);
  }

  public async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    return await this.backend.queryDefiPublishStats(query);
  }

  public async getPendingDepositTxs() {
    const txs = await this.backend.getPendingDepositTxs();
    return txs.map(depositTxFromJson);
  }

  public async createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    depositor: EthAddress,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired: boolean,
    txRefNo: number,
  ) {
    const json = await this.backend.createDepositProof(
      assetId,
      publicInput.toString(),
      privateOutput.toString(),
      depositor.toString(),
      recipient.toString(),
      recipientSpendingKeyRequired,
      txRefNo,
    );
    return proofOutputFromJson(json);
  }

  public async createPaymentProofInputs(
    userId: GrumpkinAddress,
    assetId: number,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    noteRecipient: GrumpkinAddress | undefined,
    recipientSpendingKeyRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    const proofInputs = await this.backend.createPaymentProofInputs(
      userId.toString(),
      assetId,
      publicInput.toString(),
      publicOutput.toString(),
      privateInput.toString(),
      recipientPrivateOutput.toString(),
      senderPrivateOutput.toString(),
      noteRecipient ? noteRecipient.toString() : undefined,
      recipientSpendingKeyRequired,
      publicOwner ? publicOwner.toString() : undefined,
      spendingPublicKey.toString(),
      allowChain,
    );
    return proofInputs.map(joinSplitProofInputFromJson);
  }

  public async createPaymentProof(input: JoinSplitProofInput, txRefNo: number) {
    const json = await this.backend.createPaymentProof(joinSplitProofInputToJson(input), txRefNo);
    return proofOutputFromJson(json);
  }

  public async createAccountProofSigningData(
    accountPublicKey: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
  ) {
    const signingData = await this.backend.createAccountProofSigningData(
      accountPublicKey.toString(),
      alias,
      migrate,
      spendingPublicKey.toString(),
      newAccountPublicKey ? newAccountPublicKey.toString() : undefined,
      newSpendingPublicKey1 ? newSpendingPublicKey1.toString() : undefined,
      newSpendingPublicKey2 ? newSpendingPublicKey2.toString() : undefined,
    );
    return Buffer.from(signingData);
  }

  public async createAccountProofInput(
    userId: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    migrate: boolean,
    newAlias: string,
    newSpendingPublicKey1: GrumpkinAddress | undefined,
    newSpendingPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ) {
    const json = await this.backend.createAccountProofInput(
      userId.toString(),
      spendingPublicKey.toString(),
      migrate,
      newAlias,
      newSpendingPublicKey1 ? newSpendingPublicKey1.toString() : undefined,
      newSpendingPublicKey2 ? newSpendingPublicKey2.toString() : undefined,
      newAccountPrivateKey ? new Uint8Array(newAccountPrivateKey) : undefined,
    );
    return accountProofInputFromJson(json);
  }

  public async createAccountProof(proofInput: AccountProofInput, txRefNo: number) {
    const json = await this.backend.createAccountProof(accountProofInputToJson(proofInput), txRefNo);
    return proofOutputFromJson(json);
  }

  public async createDefiProofInput(
    userId: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    depositValue: bigint,
    fee: bigint,
    spendingPublicKey: GrumpkinAddress,
  ) {
    const proofInputs = await this.backend.createDefiProofInput(
      userId.toString(),
      bridgeCallData.toString(),
      depositValue.toString(),
      fee.toString(),
      spendingPublicKey.toString(),
    );
    return proofInputs.map(joinSplitProofInputFromJson);
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    const json = await this.backend.createDefiProof(joinSplitProofInputToJson(input), txRefNo);
    return proofOutputFromJson(json);
  }

  public async sendProofs(proofs: ProofOutput[], proofTxs: Tx[] = []) {
    const txIds = await this.backend.sendProofs(proofs.map(proofOutputToJson), proofTxs.map(txToJson));
    return txIds.map(TxId.fromString);
  }

  public async awaitSynchronised(timeout?: number) {
    await this.backend.awaitSynchronised(timeout);
  }

  public async isUserSynching(userId: GrumpkinAddress) {
    return await this.backend.isUserSynching(userId.toString());
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress, timeout?: number) {
    await this.backend.awaitUserSynchronised(userId.toString(), timeout);
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    await this.backend.awaitSettlement(txId.toString(), timeout);
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    await this.backend.awaitDefiDepositCompletion(txId.toString(), timeout);
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    await this.backend.awaitDefiFinalisation(txId.toString(), timeout);
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    await this.backend.awaitDefiSettlement(txId.toString(), timeout);
  }

  public async getDefiInteractionNonce(txId: TxId) {
    return await this.backend.getDefiInteractionNonce(txId.toString());
  }

  public async userExists(userId: GrumpkinAddress) {
    return await this.backend.userExists(userId.toString());
  }

  public async getUsers() {
    const accountPublicKeys = await this.backend.getUsers();
    return accountPublicKeys.map(pk => GrumpkinAddress.fromString(pk));
  }

  public async derivePublicKey(privateKey: Buffer) {
    const publicKey = await this.backend.derivePublicKey(new Uint8Array(privateKey));
    return GrumpkinAddress.fromString(publicKey);
  }

  public async constructSignature(message: Buffer, privateKey: Buffer) {
    const signature = await this.backend.constructSignature(new Uint8Array(message), new Uint8Array(privateKey));
    return SchnorrSignature.fromString(signature);
  }

  public async addUser(accountPrivateKey: Buffer, noSync?: boolean) {
    const accountPublicKey = await this.backend.addUser(new Uint8Array(accountPrivateKey), noSync);
    return GrumpkinAddress.fromString(accountPublicKey);
  }

  public async removeUser(userId: GrumpkinAddress) {
    await this.backend.removeUser(userId.toString());
  }

  public async getUserSyncedToRollup(userId: GrumpkinAddress) {
    return await this.backend.getUserSyncedToRollup(userId.toString());
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    const keys = await this.backend.getSpendingKeys(userId.toString());
    return keys.map(k => Buffer.from(k));
  }

  public async getBalances(userId: GrumpkinAddress) {
    const balances = await this.backend.getBalances(userId.toString());
    return balances.map(assetValueFromJson);
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number) {
    const balanceStr = await this.backend.getBalance(userId.toString(), assetId);
    return BigInt(balanceStr);
  }

  public async getSpendableNoteValues(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const valueArr = await this.backend.getSpendableNoteValues(
      userId.toString(),
      assetId,
      spendingKeyRequired,
      excludePendingNotes,
    );
    return valueArr.map(v => BigInt(v));
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const valueStr = await this.backend.getSpendableSum(
      userId.toString(),
      assetId,
      spendingKeyRequired,
      excludePendingNotes,
    );
    return BigInt(valueStr);
  }

  public async getSpendableSums(userId: GrumpkinAddress, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    const sums = await this.backend.getSpendableSums(userId.toString(), spendingKeyRequired, excludePendingNotes);
    return sums.map(assetValueFromJson);
  }

  public async getMaxSpendableNoteValues(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    const valueArr = await this.backend.getMaxSpendableNoteValues(
      userId.toString(),
      assetId,
      spendingKeyRequired,
      excludePendingNotes,
      numNotes,
    );
    return valueArr.map(v => BigInt(v));
  }

  public async pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return (
      await this.backend.pickNotes(
        userId.toString(),
        assetId,
        value.toString(),
        spendingKeyRequired,
        excludePendingNotes,
      )
    ).map(noteFromJson);
  }

  public async pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const note = await this.backend.pickNote(
      userId.toString(),
      assetId,
      value.toString(),
      spendingKeyRequired,
      excludePendingNotes,
    );
    return note ? noteFromJson(note) : undefined;
  }

  public async getUserTxs(userId: GrumpkinAddress) {
    const txs = await this.backend.getUserTxs(userId.toString());
    return txs.map(coreUserTxFromJson);
  }
}

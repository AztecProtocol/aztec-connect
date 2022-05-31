import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { assetValueFromJson } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { joinSplitTxFromJson, rollupProviderStatusFromJson } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import EventEmitter from 'events';
import { coreUserTxFromJson } from '../core_tx';
import { Note, noteFromJson, noteToJson } from '../note';
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
} from '../proofs';
import { userDataFromJson } from '../user';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { CoreSdkSerializedInterface } from './core_sdk_serialized_interface';
import { SdkEvent, sdkStatusFromJson } from './sdk_status';

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

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.backend.isAccountRegistered(accountPublicKey.toString());
  }

  public async isRemoteAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.backend.isRemoteAccountRegistered(accountPublicKey.toString());
  }

  public async isAliasRegistered(alias: string) {
    return this.backend.isAliasRegistered(alias);
  }

  public async isRemoteAliasRegistered(alias: string) {
    return this.backend.isRemoteAliasRegistered(alias);
  }

  public async accountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    return this.backend.accountExists(accountPublicKey.toString(), alias);
  }

  public async remoteAccountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    return this.backend.remoteAccountExists(accountPublicKey.toString(), alias);
  }

  public async getAccountPublicKey(alias: string) {
    const key = await this.backend.getAccountPublicKey(alias);
    return key ? GrumpkinAddress.fromString(key) : undefined;
  }

  public async getRemoteUnsettledAccountPublicKey(alias: string) {
    const key = await this.backend.getRemoteUnsettledAccountPublicKey(alias);
    return key ? GrumpkinAddress.fromString(key) : undefined;
  }

  public async getTxFees(assetId: number) {
    const txFees = await this.backend.getTxFees(assetId);
    return txFees.map(fees => fees.map(assetValueFromJson));
  }

  public async getDefiFees(bridgeId: BridgeId) {
    const fees = await this.backend.getDefiFees(bridgeId.toString());
    return fees.map(assetValueFromJson);
  }

  public async createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    depositor: EthAddress,
    recipient: GrumpkinAddress,
    recipientAccountRequired: boolean,
    txRefNo: number,
  ) {
    const json = await this.backend.createDepositProof(
      assetId,
      publicInput.toString(),
      privateOutput.toString(),
      depositor.toString(),
      recipient.toString(),
      recipientAccountRequired,
      txRefNo,
    );
    return proofOutputFromJson(json);
  }

  public async createPaymentProofInput(
    userId: GrumpkinAddress,
    assetId: number,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    noteRecipient: GrumpkinAddress | undefined,
    recipientAccountRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    const json = await this.backend.createPaymentProofInput(
      userId.toString(),
      assetId,
      publicInput.toString(),
      publicOutput.toString(),
      privateInput.toString(),
      recipientPrivateOutput.toString(),
      senderPrivateOutput.toString(),
      noteRecipient ? noteRecipient.toString() : undefined,
      recipientAccountRequired,
      publicOwner ? publicOwner.toString() : undefined,
      spendingPublicKey.toString(),
      allowChain,
    );
    return joinSplitProofInputFromJson(json);
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
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newSpendingPublicKey1: GrumpkinAddress | undefined,
    newSpendingPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ) {
    const json = await this.backend.createAccountProofInput(
      userId.toString(),
      alias,
      migrate,
      spendingPublicKey.toString(),
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
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ) {
    const json = await this.backend.createDefiProofInput(
      userId.toString(),
      bridgeId.toString(),
      depositValue.toString(),
      inputNotes.map(n => noteToJson(n)),
      spendingPublicKey.toString(),
    );
    return joinSplitProofInputFromJson(json);
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    const json = await this.backend.createDefiProof(joinSplitProofInputToJson(input), txRefNo);
    return proofOutputFromJson(json);
  }

  public async sendProofs(proofs: ProofOutput[]) {
    const txIds = await this.backend.sendProofs(proofs.map(proofOutputToJson));
    return txIds.map(TxId.fromString);
  }

  public async awaitSynchronised() {
    await this.backend.awaitSynchronised();
  }

  public async isUserSynching(userId: GrumpkinAddress) {
    return this.backend.isUserSynching(userId.toString());
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress) {
    await this.backend.awaitUserSynchronised(userId.toString());
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
    return this.backend.getDefiInteractionNonce(txId.toString());
  }

  public async userExists(userId: GrumpkinAddress) {
    return this.backend.userExists(userId.toString());
  }

  public async getUserData(userId: GrumpkinAddress) {
    const json = await this.backend.getUserData(userId.toString());
    return userDataFromJson(json);
  }

  public async getUsersData() {
    const json = await this.backend.getUsersData();
    return json.map(userDataFromJson);
  }

  public async derivePublicKey(privateKey: Buffer) {
    const publicKey = await this.backend.derivePublicKey(new Uint8Array(privateKey));
    return GrumpkinAddress.fromString(publicKey);
  }

  public async constructSignature(message: Buffer, privateKey: Buffer) {
    const signature = await this.backend.constructSignature(new Uint8Array(message), new Uint8Array(privateKey));
    return SchnorrSignature.fromString(signature);
  }

  public async addUser(privateKey: Buffer, noSync?: boolean) {
    const json = await this.backend.addUser(new Uint8Array(privateKey), noSync);
    return userDataFromJson(json);
  }

  public async removeUser(userId: GrumpkinAddress) {
    await this.backend.removeUser(userId.toString());
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    const keys = await this.backend.getSpendingKeys(userId.toString());
    return keys.map(k => Buffer.from(k));
  }

  public async getBalances(userId: GrumpkinAddress, unsafe?: boolean) {
    const balances = await this.backend.getBalances(userId.toString(), unsafe);
    return balances.map(assetValueFromJson);
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number, unsafe?: boolean) {
    const balanceStr = await this.backend.getBalance(userId.toString(), assetId, unsafe);
    return BigInt(balanceStr);
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    const valueStr = await this.backend.getSpendableSum(userId.toString(), assetId, excludePendingNotes, unsafe);
    return BigInt(valueStr);
  }

  public async getSpendableSums(userId: GrumpkinAddress, excludePendingNotes?: boolean, unsafe?: boolean) {
    const sums = await this.backend.getSpendableSums(userId.toString(), excludePendingNotes, unsafe);
    return sums.map(assetValueFromJson);
  }

  public async getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    const valueStr = await this.backend.getMaxSpendableValue(
      userId.toString(),
      assetId,
      numNotes,
      excludePendingNotes,
      unsafe,
    );
    return BigInt(valueStr);
  }

  public async pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    return (
      await this.backend.pickNotes(userId.toString(), assetId, value.toString(), excludePendingNotes, unsafe)
    ).map(noteFromJson);
  }

  public async pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ) {
    const note = await this.backend.pickNote(userId.toString(), assetId, value.toString(), excludePendingNotes, unsafe);
    return note ? noteFromJson(note) : undefined;
  }

  public async getUserTxs(userId: GrumpkinAddress) {
    const txs = await this.backend.getUserTxs(userId.toString());
    return txs.map(coreUserTxFromJson);
  }

  public async getRemoteUnsettledPaymentTxs() {
    const txs = await this.backend.getRemoteUnsettledPaymentTxs();
    return txs.map(joinSplitTxFromJson);
  }
}

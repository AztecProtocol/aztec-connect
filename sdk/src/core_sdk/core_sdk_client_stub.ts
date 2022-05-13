import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { assetValueFromJson } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import {
  accountTxFromJson,
  joinSplitTxFromJson,
  rollupProviderStatusFromJson,
} from '@aztec/barretenberg/rollup_provider';
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
 * Translates the CoreSdkInterface from normal types such as bigint, Buffer, AccountId, etc. into types
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
            this.emit(event, AccountId.fromString(userId));
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

  public async getTxFees(assetId: number) {
    const txFees = await this.backend.getTxFees(assetId);
    return txFees.map(fees => fees.map(assetValueFromJson));
  }

  public async getDefiFees(bridgeId: BridgeId) {
    const fees = await this.backend.getDefiFees(bridgeId.toString());
    return fees.map(assetValueFromJson);
  }

  public async getLatestAccountNonce(publicKey: GrumpkinAddress) {
    return this.backend.getLatestAccountNonce(publicKey.toString());
  }

  public async getRemoteLatestAccountNonce(publicKey: GrumpkinAddress) {
    return this.backend.getRemoteLatestAccountNonce(publicKey.toString());
  }

  public async getLatestAliasNonce(alias: string) {
    return this.backend.getLatestAliasNonce(alias);
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.backend.getRemoteLatestAliasNonce(alias);
  }

  public async getAccountId(alias: string, accountNonce?: number) {
    const accountId = await this.backend.getAccountId(alias, accountNonce);
    return accountId ? AccountId.fromString(accountId) : undefined;
  }

  public async getRemoteAccountId(alias: string, accountNonce?: number) {
    const accountId = await this.backend.getRemoteAccountId(alias, accountNonce);
    return accountId ? AccountId.fromString(accountId) : undefined;
  }

  public async isAliasAvailable(alias: string) {
    return this.backend.isAliasAvailable(alias);
  }

  public async isRemoteAliasAvailable(alias: string) {
    return this.backend.isRemoteAliasAvailable(alias);
  }

  public async computeAliasHash(alias: string) {
    const hash = await this.backend.computeAliasHash(alias);
    return AliasHash.fromString(hash);
  }

  public async createPaymentProofInput(
    userId: AccountId,
    assetId: number,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    noteRecipient: AccountId | undefined,
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
    signingPubKey: GrumpkinAddress,
    alias: string,
    accountNonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    const signingData = await this.backend.createAccountProofSigningData(
      signingPubKey.toString(),
      alias,
      accountNonce,
      migrate,
      accountPublicKey.toString(),
      newAccountPublicKey ? newAccountPublicKey.toString() : undefined,
      newSigningPubKey1 ? newSigningPubKey1.toString() : undefined,
      newSigningPubKey2 ? newSigningPubKey2.toString() : undefined,
    );
    return Buffer.from(signingData);
  }

  public async createAccountProofInput(
    userId: AccountId,
    aliasHash: AliasHash,
    migrate: boolean,
    signingPublicKey: GrumpkinAddress,
    newSigningPublicKey1: GrumpkinAddress | undefined,
    newSigningPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ) {
    const json = await this.backend.createAccountProofInput(
      userId.toString(),
      aliasHash.toString(),
      migrate,
      signingPublicKey.toString(),
      newSigningPublicKey1 ? newSigningPublicKey1.toString() : undefined,
      newSigningPublicKey2 ? newSigningPublicKey2.toString() : undefined,
      newAccountPrivateKey ? new Uint8Array(newAccountPrivateKey) : undefined,
    );
    return accountProofInputFromJson(json);
  }

  public async createAccountProof(proofInput: AccountProofInput, txRefNo: number) {
    const json = await this.backend.createAccountProof(accountProofInputToJson(proofInput), txRefNo);
    return proofOutputFromJson(json);
  }

  public async createDefiProofInput(
    userId: AccountId,
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

  public isUserSynching(userId: AccountId) {
    return this.backend.isUserSynching(userId.toString());
  }

  public async awaitUserSynchronised(userId: AccountId) {
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

  public async userExists(userId: AccountId) {
    return this.backend.userExists(userId.toString());
  }

  public async getUserData(userId: AccountId) {
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

  public async addUser(privateKey: Buffer, accountNonce?: number, noSync?: boolean) {
    const json = await this.backend.addUser(new Uint8Array(privateKey), accountNonce, noSync);
    return userDataFromJson(json);
  }

  public async removeUser(userId: AccountId) {
    await this.backend.removeUser(userId.toString());
  }

  public async getSigningKeys(accountId: AccountId) {
    const keys = await this.backend.getSigningKeys(accountId.toString());
    return keys.map(k => Buffer.from(k));
  }

  public async getBalances(userId: AccountId) {
    const balances = await this.backend.getBalances(userId.toString());
    return balances.map(assetValueFromJson);
  }

  public async getBalance(assetId: number, userId: AccountId) {
    const balanceStr = await this.backend.getBalance(assetId, userId.toString());
    return BigInt(balanceStr);
  }

  public async getSpendableSum(assetId: number, userId: AccountId, excludePendingNotes?: boolean) {
    const valueStr = await this.backend.getSpendableSum(assetId, userId.toString(), excludePendingNotes);
    return BigInt(valueStr);
  }

  public async getSpendableSums(userId: AccountId, excludePendingNotes?: boolean) {
    const sums = await this.backend.getSpendableSums(userId.toString(), excludePendingNotes);
    return sums.map(assetValueFromJson);
  }

  public async getMaxSpendableValue(
    assetId: number,
    userId: AccountId,
    numNotes?: number,
    excludePendingNotes?: boolean,
  ) {
    const valueStr = await this.backend.getMaxSpendableValue(assetId, userId.toString(), numNotes, excludePendingNotes);
    return BigInt(valueStr);
  }

  public async pickNotes(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean) {
    return (await this.backend.pickNotes(userId.toString(), assetId, value.toString(), excludePendingNotes)).map(
      noteFromJson,
    );
  }

  public async pickNote(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean) {
    const note = await this.backend.pickNote(userId.toString(), assetId, value.toString(), excludePendingNotes);
    return note ? noteFromJson(note) : undefined;
  }

  public async getUserTxs(userId: AccountId) {
    const txs = await this.backend.getUserTxs(userId.toString());
    return txs.map(coreUserTxFromJson);
  }

  public async getRemoteUnsettledAccountTxs() {
    const txs = await this.backend.getRemoteUnsettledAccountTxs();
    return txs.map(accountTxFromJson);
  }

  public async getRemoteUnsettledPaymentTxs() {
    const txs = await this.backend.getRemoteUnsettledPaymentTxs();
    return txs.map(joinSplitTxFromJson);
  }
}

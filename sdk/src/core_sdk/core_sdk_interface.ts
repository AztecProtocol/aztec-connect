import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { AccountTx, JoinSplitTx, RollupProviderStatus } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreUserTx } from '../core_tx';
import { Note } from '../note';
import { AccountProofInput, JoinSplitProofInput, ProofOutput } from '../proofs';
import { UserData } from '../user';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';

export interface CoreSdkInterface {
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: AccountId) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
  on(event: SdkEvent.DESTROYED, listener: () => void): this;

  init(options: CoreSdkOptions): Promise<void>;

  run(): Promise<void>;

  destroy(): Promise<void>;

  getLocalStatus(): Promise<SdkStatus>;

  getRemoteStatus(): Promise<RollupProviderStatus>;

  getTxFees(assetId: number): Promise<AssetValue[][]>;

  getDefiFees(bridgeId: BridgeId): Promise<AssetValue[]>;

  getLatestAccountNonce(publicKey: GrumpkinAddress): Promise<number>;

  getRemoteLatestAccountNonce(publicKey: GrumpkinAddress): Promise<number>;

  getLatestAliasNonce(alias: string): Promise<number>;

  getRemoteLatestAliasNonce(alias: string): Promise<number>;

  getAccountId(alias: string, accountNonce?: number): Promise<AccountId | undefined>;

  getRemoteAccountId(alias: string, accountNonce?: number): Promise<AccountId | undefined>;

  isAliasAvailable(alias: string): Promise<boolean>;

  isRemoteAliasAvailable(alias: string): Promise<boolean>;

  computeAliasHash(alias: string): Promise<AliasHash>;

  createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    noteRecipient: AccountId,
    publicOwner: EthAddress,
    txRefNo: number,
  ): Promise<ProofOutput>;

  createPaymentProofInput(
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
  ): Promise<JoinSplitProofInput>;

  createPaymentProof(input: JoinSplitProofInput, txRefNo: number): Promise<ProofOutput>;

  createAccountProofSigningData(
    signingPubKey: GrumpkinAddress,
    alias: string,
    accountNonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ): Promise<Buffer>;

  createAccountProofInput(
    userId: AccountId,
    aliasHash: AliasHash,
    migrate: boolean,
    signingPublicKey: GrumpkinAddress,
    newSigningPublicKey1: GrumpkinAddress | undefined,
    newSigningPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ): Promise<AccountProofInput>;

  createAccountProof(input: AccountProofInput, txRefNo: number): Promise<ProofOutput>;

  createDefiProofInput(
    userId: AccountId,
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ): Promise<JoinSplitProofInput>;

  createDefiProof(input: JoinSplitProofInput, txRefNo: number): Promise<ProofOutput>;

  sendProofs(proofs: ProofOutput[]): Promise<TxId[]>;

  awaitSynchronised(): Promise<void>;

  isUserSynching(userId: AccountId): Promise<boolean>;

  awaitUserSynchronised(userId: AccountId): Promise<void>;

  awaitSettlement(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiDepositCompletion(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiFinalisation(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiSettlement(txId: TxId, timeout?: number): Promise<void>;

  getDefiInteractionNonce(txId: TxId): Promise<number | undefined>;

  userExists(userId: AccountId): Promise<boolean>;

  getUserData(userId: AccountId): Promise<UserData>;

  getUsersData(): Promise<UserData[]>;

  derivePublicKey(privateKey: Buffer): Promise<GrumpkinAddress>;

  constructSignature(message: Buffer, privateKey: Buffer): Promise<SchnorrSignature>;

  addUser(privateKey: Buffer, accountNonce?: number, noSync?: boolean): Promise<UserData>;

  removeUser(userId: AccountId): Promise<void>;

  getSigningKeys(userId: AccountId): Promise<Buffer[]>;

  getBalances(userId: AccountId): Promise<AssetValue[]>;

  getBalance(assetId: number, userId: AccountId): Promise<bigint>;

  getSpendableSum(assetId: number, userId: AccountId, excludePendingNotes?: boolean): Promise<bigint>;

  getSpendableSums(userId: AccountId, excludePendingNotes?: boolean): Promise<AssetValue[]>;

  getMaxSpendableValue(
    assetId: number,
    userId: AccountId,
    numNotes?: number,
    excludePendingNotes?: boolean,
  ): Promise<bigint>;

  pickNotes(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean): Promise<Note[]>;

  pickNote(userId: AccountId, assetId: number, value: bigint, excludePendingNotes?: boolean): Promise<Note | undefined>;

  getUserTxs(userId: AccountId): Promise<CoreUserTx[]>;

  getRemoteUnsettledAccountTxs(): Promise<AccountTx[]>;

  getRemoteUnsettledPaymentTxs(): Promise<JoinSplitTx[]>;
}

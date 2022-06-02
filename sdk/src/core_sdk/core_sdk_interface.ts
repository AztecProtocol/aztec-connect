import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { JoinSplitTx, RollupProviderStatus } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreUserTx } from '../core_tx';
import { Note } from '../note';
import { AccountProofInput, JoinSplitProofInput, ProofOutput } from '../proofs';
import { UserData } from '../user';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';

export interface CoreSdkInterface {
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: GrumpkinAddress) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
  on(event: SdkEvent.DESTROYED, listener: () => void): this;

  init(options: CoreSdkOptions): Promise<void>;

  run(): Promise<void>;

  destroy(): Promise<void>;

  getLocalStatus(): Promise<SdkStatus>;

  getRemoteStatus(): Promise<RollupProviderStatus>;

  isAccountRegistered(accountPublicKey: GrumpkinAddress): Promise<boolean>;

  isRemoteAccountRegistered(accountPublicKey: GrumpkinAddress): Promise<boolean>;

  isAliasRegistered(alias: string): Promise<boolean>;

  isRemoteAliasRegistered(alias: string): Promise<boolean>;

  accountExists(accountPublicKey: GrumpkinAddress, alias: string): Promise<boolean>;

  remoteAccountExists(accountPublicKey: GrumpkinAddress, alias: string): Promise<boolean>;

  getAccountPublicKey(alias: string): Promise<GrumpkinAddress | undefined>;

  getRemoteUnsettledAccountPublicKey(alias: string): Promise<GrumpkinAddress | undefined>;

  getTxFees(assetId: number): Promise<AssetValue[][]>;

  getDefiFees(bridgeId: BridgeId): Promise<AssetValue[]>;

  createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    depositor: EthAddress,
    recipient: GrumpkinAddress,
    recipientAccountRequired: boolean,
    txRefNo: number,
  ): Promise<ProofOutput>;

  createPaymentProofInput(
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
  ): Promise<JoinSplitProofInput>;

  createPaymentProof(input: JoinSplitProofInput, txRefNo: number): Promise<ProofOutput>;

  createAccountProofSigningData(
    userId: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
  ): Promise<Buffer>;

  createAccountProofInput(
    userId: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newSpendingPublicKey1: GrumpkinAddress | undefined,
    newSpendingPublicKey2: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
  ): Promise<AccountProofInput>;

  createAccountProof(input: AccountProofInput, txRefNo: number): Promise<ProofOutput>;

  createDefiProofInput(
    userId: GrumpkinAddress,
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ): Promise<JoinSplitProofInput>;

  createDefiProof(input: JoinSplitProofInput, txRefNo: number): Promise<ProofOutput>;

  sendProofs(proofs: ProofOutput[]): Promise<TxId[]>;

  awaitSynchronised(): Promise<void>;

  isUserSynching(userId: GrumpkinAddress): Promise<boolean>;

  awaitUserSynchronised(userId: GrumpkinAddress): Promise<void>;

  awaitSettlement(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiDepositCompletion(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiFinalisation(txId: TxId, timeout?: number): Promise<void>;

  awaitDefiSettlement(txId: TxId, timeout?: number): Promise<void>;

  getDefiInteractionNonce(txId: TxId): Promise<number | undefined>;

  userExists(userId: GrumpkinAddress): Promise<boolean>;

  getUserData(userId: GrumpkinAddress): Promise<UserData>;

  getUsersData(): Promise<UserData[]>;

  derivePublicKey(privateKey: Buffer): Promise<GrumpkinAddress>;

  constructSignature(message: Buffer, privateKey: Buffer): Promise<SchnorrSignature>;

  addUser(accountPrivateKey: Buffer, noSync?: boolean): Promise<UserData>;

  removeUser(userId: GrumpkinAddress): Promise<void>;

  getSpendingKeys(userId: GrumpkinAddress): Promise<Buffer[]>;

  getBalances(userId: GrumpkinAddress, unsafe?: boolean): Promise<AssetValue[]>;

  getBalance(userId: GrumpkinAddress, assetId: number, unsafe?: boolean): Promise<bigint>;

  getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ): Promise<bigint>;

  getSpendableSums(userId: GrumpkinAddress, excludePendingNotes?: boolean, unsafe?: boolean): Promise<AssetValue[]>;

  getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ): Promise<bigint>;

  pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ): Promise<Note[]>;

  pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    excludePendingNotes?: boolean,
    unsafe?: boolean,
  ): Promise<Note | undefined>;

  getUserTxs(userId: GrumpkinAddress): Promise<CoreUserTx[]>;

  getRemoteUnsettledPaymentTxs(): Promise<JoinSplitTx[]>;
}

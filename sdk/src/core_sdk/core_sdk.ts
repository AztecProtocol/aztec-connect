import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, ProofId, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { AccountData, InitHelpers } from '@aztec/barretenberg/environment';
import { FftFactory } from '@aztec/barretenberg/fft';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState } from '@aztec/barretenberg/world_state';
import { createLogger } from '@aztec/barretenberg/debug';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { Alias, Database, SigningKey } from '../database';
import {
  AccountProofCreator,
  AccountProofInput,
  DefiDepositProofCreator,
  JoinSplitProofInput,
  PaymentProofCreator,
  ProofOutput,
} from '../proofs';
import { SerialQueue } from '../serial_queue';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';

const debug = createLogger('bb:core_sdk');

enum SdkInitState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  DESTROYED = 'DESTROYED',
}

/**
 * CoreSdk is responsible for keeping everything in sync and proof construction.
 * A serial queue is used to ensure initialisation, synching, proof construction, and block processing, are synchronised.
 * init() should be called before making any other calls to construct the basic components.
 * run() should be called once a client wants to start synching, or requesting proof construction.
 */
export class CoreSdk extends EventEmitter implements CoreSdkInterface {
  private options!: CoreSdkOptions;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private paymentProofCreator!: PaymentProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private defiDepositProofCreator!: DefiDepositProofCreator;
  private blockQueue = new MemoryFifo<Block>();
  private serialQueue = new SerialQueue();
  private userStateFactory!: UserStateFactory;
  private sdkStatus: SdkStatus = {
    serverUrl: '',
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    syncedToRollup: -1,
    latestRollupId: -1,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
  };
  private initState = SdkInitState.UNINITIALIZED;
  private processBlocksPromise?: Promise<void>;
  private noteAlgos!: NoteAlgorithms;
  private blake2s!: Blake2s;
  private grumpkin!: Grumpkin;
  private schnorr!: Schnorr;

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private barretenberg: BarretenbergWasm,
    private pedersen: Pedersen,
    private pippenger: Pippenger,
    private fftFactory: FftFactory,
    private workerPool?: WorkerPool,
  ) {
    super();
  }

  /**
   * Basic initialisation of the sdk.
   * Call run() to actually start syncing etc.
   * If multiple calls to init occur (e.g. many tabs calling into a service worker),
   * each blocks until the first call completes.
   */
  public async init(options: CoreSdkOptions) {
    // Take copy so we can modify internally.
    this.options = { ...options };

    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Already initialized.');
    }

    this.noteAlgos = new NoteAlgorithms(this.barretenberg);
    this.blake2s = new Blake2s(this.barretenberg);
    this.grumpkin = new Grumpkin(this.barretenberg);
    this.schnorr = new Schnorr(this.barretenberg);
    this.userStateFactory = new UserStateFactory(this.grumpkin, this.noteAlgos, this.db, this.rollupProvider);
    this.worldState = new WorldState(this.leveldb, this.pedersen);

    const {
      blockchainStatus: { chainId, rollupContractAddress },
    } = await this.getRemoteStatus();

    // Clear all data if contract changed.
    const rca = await this.getLocalRollupContractAddress();
    if (rca && !rca.equals(rollupContractAddress)) {
      debug('Erasing database...');
      await this.leveldb.clear();
      await this.db.clear();
    }

    // TODO: Refactor all leveldb saved config into a little PersistentConfig class with getters/setters.
    await this.leveldb.put('rollupContractAddress', rollupContractAddress.toBuffer());

    // Ensures we can get the list of users and access current known balances.
    await this.initUserStates();

    // Allows us to query the merkle tree roots etc.
    await this.worldState.init();

    this.sdkStatus = {
      ...this.sdkStatus,
      serverUrl: options.serverUrl,
      chainId,
      rollupContractAddress: rollupContractAddress,
      dataSize: this.worldState.getSize(),
      dataRoot: this.worldState.getRoot(),
      syncedToRollup: await this.getSyncedToRollup(),
      latestRollupId: +(await this.leveldb.get('latestRollupId').catch(() => -1)),
    };

    this.updateInitState(SdkInitState.INITIALIZED);
  }

  public async destroy() {
    this.serialQueue.push(async () => {
      debug('Destroying...');
      await this.stopReceivingBlocks();
      await Promise.all(this.userStates.map(us => this.stopSyncingUserState(us)));
      await this.leveldb.close();
      await this.db.close();
      await this.workerPool?.destroy();
      this.serialQueue.destroy();
      this.updateInitState(SdkInitState.DESTROYED);
      this.removeAllListeners();
      debug('Destroyed.');
    });
  }

  public async getLocalStatus() {
    return { ...this.sdkStatus };
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async getTxFees(assetId: number) {
    return this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeId: BridgeId) {
    return this.rollupProvider.getDefiFees(bridgeId);
  }

  /**
   * Return the latest nonce for a given public key, derived from chain data.
   */
  public async getLatestAccountNonce(publicKey: GrumpkinAddress) {
    return (await this.db.getLatestNonceByAddress(publicKey)) || 0;
  }

  public async getRemoteLatestAccountNonce(publicKey: GrumpkinAddress) {
    return (await this.rollupProvider.getLatestAccountNonce(publicKey)) || 0;
  }

  public async getLatestAliasNonce(alias: string) {
    const aliasHash = await this.computeAliasHash(alias);
    return (await this.db.getLatestNonceByAliasHash(aliasHash)) ?? 0;
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.rollupProvider.getLatestAliasNonce(alias);
  }

  public async getAccountId(alias: string, nonce?: number) {
    const aliasHash = await this.computeAliasHash(alias);
    return this.db.getAccountId(aliasHash, nonce);
  }

  public async getRemoteAccountId(alias: string, nonce?: number) {
    return this.rollupProvider.getAccountId(alias, nonce);
  }

  public async isAliasAvailable(alias: string) {
    return !(await this.getLatestAliasNonce(alias));
  }

  public async isRemoteAliasAvailable(alias: string) {
    return !(await this.rollupProvider.getLatestAliasNonce(alias));
  }

  public async computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  public async getDefiInteractionNonce(txId: TxId) {
    const tx = await this.db.getDefiTx(txId);
    if (!tx) {
      throw new Error('Unknown txId');
    }
    return tx.interactionNonce;
  }

  public async userExists(userId: AccountId) {
    return !!(await this.db.getUser(userId));
  }

  public async getUserData(userId: AccountId) {
    return this.getUserState(userId).getUser();
  }

  public async getUsersData() {
    return this.userStates.map(us => us.getUser());
  }

  public async derivePublicKey(privateKey: Buffer) {
    return new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey));
  }

  public async constructSignature(message: Buffer, privateKey: Buffer) {
    return this.schnorr.constructSignature(message, privateKey);
  }

  public async addUser(privateKey: Buffer, nonce?: number, noSync = false) {
    const publicKey = await this.derivePublicKey(privateKey);
    if (nonce === undefined) {
      nonce = await this.getLatestAccountNonce(publicKey);
    }
    const id = new AccountId(publicKey, nonce);
    if (await this.db.getUser(id)) {
      throw new Error(`User already exists: ${id}`);
    }

    let syncedToRollup = -1;
    if (noSync) {
      const {
        blockchainStatus: { nextRollupId },
      } = await this.getRemoteStatus();
      syncedToRollup = nextRollupId - 1;
    }

    const aliasHash = nonce > 0 ? await this.db.getAliasHashByAddress(publicKey) : undefined;
    const user = { id, privateKey, publicKey, nonce, aliasHash, syncedToRollup };
    await this.db.addUser(user);

    const userState = this.userStateFactory.createUserState(user);
    await userState.init();
    this.userStates.push(userState);
    this.startSyncingUserState(userState);

    this.emit(SdkEvent.UPDATED_USERS);

    return userState.getUser();
  }

  public async removeUser(userId: AccountId) {
    const userState = this.getUserState(userId);
    this.userStates = this.userStates.filter(us => us !== userState);
    this.stopSyncingUserState(userState);
    await this.db.removeUser(userId);

    this.emit(SdkEvent.UPDATED_USERS);
  }

  public async getSigningKeys(accountId: AccountId) {
    // TODO - fetch the keys from server so that the account doesn't have to be added locally.
    const keys = await this.db.getUserSigningKeys(accountId);
    return keys.map(k => k.key);
  }

  public async getBalances(userId: AccountId) {
    return this.getUserState(userId).getBalances();
  }

  public async getBalance(assetId: number, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getBalance(assetId);
  }

  public async getMaxSpendableValue(assetId: number, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getMaxSpendableValue(assetId);
  }

  public async getSpendableNotes(assetId: number, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getSpendableNotes(assetId);
  }

  public async getSpendableSum(assetId: number, userId: AccountId) {
    const userState = this.getUserState(userId);
    return userState.getSpendableSum(assetId);
  }

  public async getNotes(userId: AccountId) {
    return this.db.getUserNotes(userId);
  }

  public async pickNotes(userId: AccountId, assetId: number, value: bigint) {
    return this.getUserState(userId).pickNotes(assetId, value);
  }

  public async getUserTxs(userId: AccountId) {
    return this.db.getUserTxs(userId);
  }

  public async getRemoteUnsettledAccountTxs() {
    return this.rollupProvider.getUnsettledAccountTxs();
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.rollupProvider.getUnsettledPaymentTxs();
  }

  /**
   * Kicks off data tree updates, user note decryptions, alias table updates, proving key construction.
   * Moves the sdk into RUNNING state.
   */
  public async run() {
    this.serialQueue.push(async () => {
      if (this.initState === SdkInitState.RUNNING) {
        return;
      }

      const { useKeyCache } = this.options;

      const {
        proverless,
        blockchainStatus: { verifierContractAddress },
      } = await this.getRemoteStatus();

      const vca = await this.getLocalVerifierContractAddress();
      const forceCreate = (vca && !vca.equals(verifierContractAddress)) || !useKeyCache;

      const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
      const crsData = await this.initCrsData(maxCircuitSize);

      await this.pippenger.init(crsData);
      await this.genesisSync();
      await this.startReceivingBlocks();
      this.userStates.forEach(us => this.startSyncingUserState(us));
      await this.createJoinSplitProofCreators(forceCreate, proverless);
      await this.createAccountProofCreator(forceCreate, proverless);

      // Makes the saved proving keys considered valid. Hence set this after they're saved.
      await this.leveldb.put('verifierContractAddress', verifierContractAddress.toBuffer());

      this.updateInitState(SdkInitState.RUNNING);
    });
  }

  // -------------------------------------------------------
  // PUBLIC METHODS FROM HERE ON REQUIRE run() TO BE CALLED.
  // -------------------------------------------------------

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
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      return this.paymentProofCreator.createProofInput(
        userState,
        publicInput,
        publicOutput,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        assetId,
        noteRecipient,
        publicOwner,
        spendingPublicKey,
        allowChain,
      );
    });
  }

  public async createPaymentProof(input: JoinSplitProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      return this.paymentProofCreator.createProof(input, txRefNo);
    });
  }

  public async createAccountProofSigningData(
    signingPubKey: GrumpkinAddress,
    alias: string,
    nonce: number,
    migrate: boolean,
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
    newSigningPubKey1?: GrumpkinAddress,
    newSigningPubKey2?: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = await this.computeAliasHash(alias);
      const tx = await this.accountProofCreator.createAccountTx(
        signingPubKey,
        aliasHash,
        nonce,
        migrate,
        accountPublicKey,
        newAccountPublicKey,
        newSigningPubKey1,
        newSigningPubKey2,
      );
      return this.accountProofCreator.computeSigningData(tx);
    });
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
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const newAccountPublicKey = newAccountPrivateKey ? await this.derivePublicKey(newAccountPrivateKey) : undefined;
      return this.accountProofCreator.createProofInput(
        aliasHash,
        userId.accountNonce,
        migrate,
        userId.publicKey,
        signingPublicKey,
        newAccountPublicKey,
        newSigningPublicKey1,
        newSigningPublicKey2,
      );
    });
  }

  public async createAccountProof(input: AccountProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      return this.accountProofCreator.createProof(input, txRefNo);
    });
  }

  public async createDefiProofInput(
    userId: AccountId,
    bridgeId: BridgeId,
    depositValue: bigint,
    txFee: bigint,
    inputNotes: TreeNote[] | undefined,
    spendingPublicKey: GrumpkinAddress,
  ) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      return this.defiDepositProofCreator.createProofInput(
        userState,
        bridgeId,
        depositValue,
        txFee,
        inputNotes,
        spendingPublicKey,
      );
    });
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    return this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      return this.defiDepositProofCreator.createProof(input, txRefNo);
    });
  }

  public async sendProofs(proofs: ProofOutput[]) {
    // this.assertInitState(SdkInitState.RUNNING);

    // Get userState before sending proofs to make sure that the tx owner has been added to the sdk.
    const [
      {
        tx: { userId },
      },
    ] = proofs;
    const userState = this.getUserState(userId);
    if (proofs.some(({ tx }) => !tx.userId.equals(userId))) {
      throw new Error('Inconsistent tx owners.');
    }

    const txs = proofs.map(({ proofData, offchainTxData, signature }) => ({
      proofData: proofData.rawProofData,
      offchainTxData: offchainTxData.toBuffer(),
      depositSignature: signature,
    }));
    const txIds = await this.rollupProvider.sendTxs(txs);

    for (const proof of proofs) {
      await userState.addProof(proof);
    }

    return txIds;
  }

  public async awaitSynchronised() {
    // this.assertInitState(SdkInitState.RUNNING);

    while (true) {
      try {
        if (await this.isSynchronised()) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        debug(err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async isUserSynching(userId: AccountId) {
    // this.assertInitState(SdkInitState.RUNNING);
    return this.getUserState(userId).isSyncing();
  }

  public async awaitUserSynchronised(userId: AccountId) {
    // this.assertInitState(SdkInitState.RUNNING);
    await this.getUserState(userId).awaitSynchronised();
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    // this.assertInitState(SdkInitState.RUNNING);
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting tx settlement: ${txId}`);
      }

      if (await this.db.isUserTxSettled(txId)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    // this.assertInitState(SdkInitState.RUNNING);
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.settled) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.finalised) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    const started = new Date().getTime();
    while (true) {
      if (timeout && new Date().getTime() - started > timeout * 1000) {
        throw new Error(`Timeout awaiting defi interaction: ${txId}`);
      }

      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      if (tx.claimSettled) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  private getUserState(userId: AccountId) {
    const userState = this.userStates.find(us => us.getUser().id.equals(userId));
    if (!userState) {
      throw new Error(`User not found: ${userId}`);
    }
    return userState;
  }

  private async isSynchronised() {
    const providerStatus = await this.rollupProvider.getStatus();
    const localDataRoot = this.worldState.getRoot();
    return localDataRoot.equals(providerStatus.blockchainStatus.dataRoot);
  }

  private assertInitState(state: SdkInitState) {
    if (this.initState !== state) {
      throw new Error(`Init state ${this.initState} !== ${state}`);
    }
  }

  private updateInitState(initState: SdkInitState) {
    this.initState = initState;
  }

  private async getLocalRollupContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('rollupContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  private async getLocalVerifierContractAddress() {
    const result: Buffer | undefined = await this.leveldb.get('verifierContractAddress').catch(() => undefined);
    return result ? new EthAddress(result) : undefined;
  }

  private async getSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  private async initCrsData(circuitSize: number) {
    debug('downloading crs data...');
    const crs = new Crs(circuitSize);
    await crs.download();
    debug('done.');
    return Buffer.from(crs.getData());
  }

  private async initUserStates() {
    debug('initializing user states...');
    const users = await this.db.getUsers();
    this.userStates = users.map(u => this.userStateFactory.createUserState(u));
    await Promise.all(this.userStates.map(us => us.init()));
  }

  private async startSyncingUserState(userState: UserState) {
    userState.on(UserStateEvent.UPDATED_USER_STATE, (id: Buffer) => {
      this.emit(SdkEvent.UPDATED_USER_STATE, id);
    });
    await userState.startSync();
  }

  private async stopSyncingUserState(userState: UserState) {
    userState.removeAllListeners();
    await userState.stopSync();
  }

  private async createJoinSplitProofCreators(recreateKeys: boolean, proverless: boolean) {
    const fft = await this.fftFactory.createFft(JoinSplitProver.getCircuitSize(proverless));
    const unrolledProver = new UnrolledProver(this.barretenberg, this.pippenger, fft);
    const joinSplitProver = new JoinSplitProver(unrolledProver, proverless);
    this.paymentProofCreator = new PaymentProofCreator(
      joinSplitProver,
      this.noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    this.defiDepositProofCreator = new DefiDepositProofCreator(
      joinSplitProver,
      this.noteAlgos,
      this.worldState,
      this.grumpkin,
      this.db,
    );
    await this.createJoinSplitProvingKey(joinSplitProver, recreateKeys);
  }

  private async createAccountProofCreator(forceCreate: boolean, proverless: boolean) {
    const fft = await this.fftFactory.createFft(AccountProver.getCircuitSize(proverless));
    const unrolledProver = new UnrolledProver(this.barretenberg, this.pippenger, fft);
    const accountProver = new AccountProver(unrolledProver, proverless);
    this.accountProofCreator = new AccountProofCreator(accountProver, this.worldState, this.db);
    await this.createAccountProvingKey(accountProver, forceCreate);
  }

  private async createJoinSplitProvingKey(joinSplitProver: JoinSplitProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('join-split-proving-key');
      if (provingKey) {
        debug('loading join-split proving key...');
        await joinSplitProver.loadKey(provingKey);
        return;
      }
    }

    debug('computing join-split proving key...');
    const start = new Date().getTime();
    await joinSplitProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving join-split proving key...');
      const newProvingKey = await joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('join-split-proving-key');
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  private async createAccountProvingKey(accountProver: AccountProver, forceCreate: boolean) {
    if (!forceCreate) {
      const provingKey = await this.db.getKey('account-proving-key');
      if (provingKey) {
        debug('loading account proving key...');
        await accountProver.loadKey(provingKey);
        return;
      }
    }

    debug('computing account proving key...');
    const start = new Date().getTime();
    await accountProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving account proving key...');
      const newProvingKey = await accountProver.getKey();
      await this.db.addKey('account-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('account-proving-key');
    }
    debug(`complete: ${new Date().getTime() - start}ms`);
  }

  private async syncAliasesAndKeys(accounts: AccountData[]) {
    const aliases = new Array<Alias>();
    const uniqueSigningKeys = new Map<string, SigningKey>();
    let index = 0;

    // There can be duplicate account/nonce/signing key combinations.
    // We need to just keep the most recent one.
    // This loop simulates upserts by keeping the most recent version before inserting into the DB.
    for (let i = 0; i < accounts.length; i++) {
      const {
        alias: { address, nonce },
        signingKeys: { signingKey1, signingKey2 },
      } = accounts[i];
      const accountId = new AccountId(new GrumpkinAddress(address), nonce);

      [signingKey1, signingKey2].forEach(key => {
        const keyVal = key.toString('hex') + ' - ' + accountId.toString();
        const sk: SigningKey = { treeIndex: index++, key, accountId };
        uniqueSigningKeys.set(keyVal, sk);
      });

      aliases.push({
        aliasHash: new AliasHash(accounts[i].alias.aliasHash),
        address: new GrumpkinAddress(accounts[i].alias.address),
        latestNonce: accounts[i].alias.nonce,
      });
    }
    const keys = [...uniqueSigningKeys.values()];

    debug(`synching with ${aliases.length} aliases`);
    let start = new Date().getTime();
    await this.db.setAliases(aliases);
    debug(`aliases saved in ${new Date().getTime() - start}ms`);

    debug(`synching with ${keys.length} signing keys`);
    start = new Date().getTime();
    await this.db.addUserSigningKeys(keys);
    debug(`signing keys saved in ${new Date().getTime() - start}ms`);
  }

  private async syncCommitments(accounts: AccountData[]) {
    const start = new Date().getTime();
    const commitments = accounts.flatMap(x => [x.notes.note1, x.notes.note2]);
    debug(`synching with ${commitments.length} commitments`);
    await this.worldState.processNoteCommitments(0, commitments);
    debug(`note commitments saved in ${new Date().getTime() - start}ms`);
  }

  private async genesisSync() {
    const syncedToRollup = await this.getSyncedToRollup();
    if (syncedToRollup >= 0) {
      return;
    }

    debug('initialising genesis state from server...');
    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    await this.syncAliasesAndKeys(accounts);
    await this.syncCommitments(accounts);
  }

  private async startReceivingBlocks() {
    this.rollupProvider.on('block', b => this.blockQueue.put(b));
    this.processBlocksPromise = this.processBlockQueue();

    await this.sync();

    const syncedToRollup = await this.getSyncedToRollup();
    await this.rollupProvider.start(+syncedToRollup + 1);

    debug('started processing blocks.');
  }

  private async stopReceivingBlocks() {
    await this.rollupProvider.stop();
    this.rollupProvider.removeAllListeners();
    this.blockQueue.cancel();
    await this.processBlocksPromise;
  }

  /**
   * Called when data root is not as expected. We need to save parts of leveldb we don't want to lose, erase the db,
   * and rebuild the merkle tree.
   */
  private async eraseAndRebuildDataTree() {
    debug('erasing and rebuilding data tree...');

    const rca = await this.getLocalRollupContractAddress();
    const vca = await this.getLocalVerifierContractAddress();
    await this.leveldb.clear();
    await this.leveldb.put('rollupContractAddress', rca!.toBuffer());
    await this.leveldb.put('verifierContractAddress', vca ? vca.toBuffer() : '');

    await this.worldState.init();

    const initialState = await this.rollupProvider.getInitialWorldState();
    const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
    await this.syncCommitments(accounts);

    await this.sync();
  }

  private async sync() {
    const syncedToRollup = await this.getSyncedToRollup();
    const blocks = await this.rollupProvider.getBlocks(syncedToRollup + 1);

    debug(`blocks received from rollup provider: ${blocks.length}`);

    // For debugging.
    const oldRoot = this.worldState.getRoot();
    const oldSize = this.worldState.getSize();

    if (!blocks.length) {
      // TODO: Ugly hotfix. Find root cause.
      // If no new blocks, we expect our local data root to be equal to that on falafel.
      const { dataRoot: expectedDataRoot, dataSize: expectedDataSize } = (await this.getRemoteStatus())
        .blockchainStatus;
      if (!oldRoot.equals(expectedDataRoot)) {
        debug(`old root ${oldRoot.toString('hex')}, Expected root ${expectedDataRoot.toString('hex')}`);
        await this.eraseAndRebuildDataTree();
        await this.rollupProvider.clientLog({
          message: 'Invalid dataRoot.',
          synchingFromRollup: syncedToRollup,
          blocksReceived: blocks.length,
          currentRoot: oldRoot.toString('hex'),
          currentSize: oldSize,
          expectedDataRoot: expectedDataRoot.toString('hex'),
          expectedDataSize,
        });
      }
      return;
    }

    const rollups = blocks.map(b => RollupProofData.fromBuffer(b.rollupProofData));
    const offchainTxData = blocks.map(b => b.offchainTxData);

    // For debugging.
    const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
    const expectedDataSize = rollups[0].dataStartIndex + rollups.reduce((a, r) => a + r.rollupSize * 2, 0);

    debug('synchronising data...');
    await this.worldState.processRollups(rollups);
    await this.processAliases(rollups, offchainTxData);
    await this.updateStatusRollupInfo(rollups[rollups.length - 1]);
    debug('done.');

    // TODO: Ugly hotfix. Find root cause.
    // We expect our data root to be equal to the new data root in the last block we processed.
    if (!this.worldState.getRoot().equals(expectedDataRoot)) {
      await this.eraseAndRebuildDataTree();
      this.rollupProvider.clientLog({
        message: 'Invalid dataRoot.',
        synchingFromRollup: syncedToRollup,
        blocksReceived: blocks.length,
        oldRoot: oldRoot.toString('hex'),
        oldSize,
        newRoot: this.worldState.getRoot().toString('hex'),
        newSize: this.worldState.getSize(),
        expectedDataRoot: expectedDataRoot.toString('hex'),
        expectedDataSize,
      });
      return;
    }

    // Forward the block on to each UserState for processing.
    for (const block of blocks) {
      this.userStates.forEach(us => us.processBlock(block));
    }
  }

  private async updateStatusRollupInfo(rollup: RollupProofData) {
    const rollupId = rollup.rollupId;
    const latestRollupId = this.rollupProvider.getLatestRollupId();
    await this.leveldb.put('syncedToRollup', rollupId.toString());
    await this.leveldb.put('latestRollupId', latestRollupId.toString());

    this.sdkStatus.syncedToRollup = rollupId;
    this.sdkStatus.latestRollupId = latestRollupId;
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();

    this.emit(SdkEvent.UPDATED_WORLD_STATE, rollupId, latestRollupId);
  }

  private async processBlockQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }

      await this.serialQueue.push(async () => {
        await this.worldState.syncFromDb().catch(() => {});
        const rollup = RollupProofData.fromBuffer(block.rollupProofData);
        await this.worldState.processRollup(rollup);
        await this.processAliases([rollup], [block.offchainTxData]);
        await this.updateStatusRollupInfo(rollup);

        // Forward the block on to each UserState for processing.
        this.userStates.forEach(us => us.processBlock(block));
      });
    }
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      const aliases: Alias[] = [];
      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const proof = rollup.innerProofData[i];
        if (proof.proofId !== ProofId.ACCOUNT) {
          continue;
        }

        const { accountPublicKey, accountAliasId, spendingPublicKey1 } = OffchainAccountData.fromBuffer(
          offchainData[i],
        );
        const commitment = this.noteAlgos.accountNoteCommitment(accountAliasId, accountPublicKey, spendingPublicKey1);
        // Only need to check one commitment to make sure the accountAliasId and accountPublicKey pair is valid.
        if (commitment.equals(proof.noteCommitment1)) {
          aliases.push({
            address: accountPublicKey,
            aliasHash: accountAliasId.aliasHash,
            latestNonce: accountAliasId.accountNonce,
          });
        }
      }
      return aliases;
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    await this.db.setAliases(aliases);
  }
}

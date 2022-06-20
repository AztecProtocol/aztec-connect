import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { AccountProver, JoinSplitProver, ProofId, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { Blake2s, Pedersen, randomBytes, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { FftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { NoteAlgorithms, NoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { retryUntil } from '@aztec/barretenberg/retry';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { Timer } from '@aztec/barretenberg/timer';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { BlockContext } from '../block_context/block_context';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx';
import { Alias, Database } from '../database';
import { parseGenesisAliasesAndKeys, getUserSpendingKeysFromGenesisData } from '../genesis_state.ts';
import { Note } from '../note';
import {
  AccountProofCreator,
  AccountProofInput,
  DefiDepositProofCreator,
  JoinSplitProofInput,
  PaymentProofCreator,
  ProofOutput,
} from '../proofs';
import { MutexSerialQueue, SerialQueue } from '../serial_queue';
import { SchnorrSigner } from '../signer';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state';
import { CoreSdkInterface } from './core_sdk_interface';
import { CoreSdkOptions } from './core_sdk_options';
import { SdkEvent, SdkStatus } from './sdk_status';
import { sdkVersion } from './sdk_version';
import { UserData } from '../user';

const debug = createDebugLogger('bb:core_sdk');

enum SdkInitState {
  // Constructed but uninitialized. Unusable.
  UNINITIALIZED = 'UNINITIALIZED',
  // Initialized but not yet synching data tree and user accounts. Can be queried for data, but not create proofs.
  INITIALIZED = 'INITIALIZED',
  // Synchronises data tree and user accounts. Ready for proof construction.
  RUNNING = 'RUNNING',
  // Stop requested. Wait for synching task to return.
  STOPPING = 'STOPPING',
  // Unusable.
  DESTROYED = 'DESTROYED',
}

/**
 * CoreSdk is responsible for keeping everything in sync and proof construction.
 * init() should be called before making any other calls to construct the basic components.
 * run() should be called once a client wants to start synching, or requesting proof construction.
 * Takes ownership of injected components (should destroy them etc).
 * A serial queue ensures that all calls that modify internal state happen in sequence.
 * By default, the serial queue is protected with a cross-process mutex, ensuring that if multiple instances
 * of the CoreSdk exist in different processes, that they will not modify state at the same time.
 */
export class CoreSdk extends EventEmitter implements CoreSdkInterface {
  private options!: CoreSdkOptions;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private paymentProofCreator!: PaymentProofCreator;
  private accountProofCreator!: AccountProofCreator;
  private defiDepositProofCreator!: DefiDepositProofCreator;
  private serialQueue!: SerialQueue;
  private userStateFactory!: UserStateFactory;
  private sdkStatus: SdkStatus = {
    serverUrl: '',
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    verifierContractAddress: EthAddress.ZERO,
    feePayingAssetIds: [0],
    rollupSize: -1,
    syncedToRollup: -1,
    latestRollupId: -1,
    dataRoot: Buffer.alloc(0),
    dataSize: 0,
    useKeyCache: false,
    proverless: false,
    version: sdkVersion,
  };
  private initState = SdkInitState.UNINITIALIZED;
  private noteAlgos!: NoteAlgorithms;
  private blake2s!: Blake2s;
  private grumpkin!: Grumpkin;
  private schnorr!: Schnorr;
  private syncSleep = new InterruptableSleep();
  private synchingPromise!: Promise<void>;

  constructor(
    private leveldb: LevelUp,
    private db: Database,
    private rollupProvider: RollupProvider,
    private barretenberg: BarretenbergWasm,
    private noteDecryptor: NoteDecryptor,
    private pedersen: Pedersen,
    private pippenger: Pippenger,
    private fftFactory: FftFactory,
    private workerPool?: WorkerPool,
  ) {
    super();
  }

  /**
   * Constructs internal components.
   * Erases dbs if rollup contract address changed.
   * Loads and initializes known user accounts.
   * Destroys injected components on failure.
   */
  public async init(options: CoreSdkOptions) {
    if (this.initState !== SdkInitState.UNINITIALIZED) {
      throw new Error('Already initialized.');
    }

    try {
      debug(`initializing...${sdkVersion ? ` (version: ${sdkVersion})` : ''}`);

      this.options = options;
      this.serialQueue = new MutexSerialQueue(this.db, 'aztec_core_sdk');
      this.noteAlgos = new NoteAlgorithms(this.barretenberg);
      this.blake2s = new Blake2s(this.barretenberg);
      this.grumpkin = new Grumpkin(this.barretenberg);
      this.schnorr = new Schnorr(this.barretenberg);
      this.userStateFactory = new UserStateFactory(
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.db,
        this.rollupProvider,
      );
      this.worldState = new WorldState(this.leveldb, this.pedersen);

      const {
        blockchainStatus: { chainId, rollupContractAddress, verifierContractAddress },
        runtimeConfig: { feePayingAssetIds, useKeyCache },
        rollupSize,
        proverless,
      } = await this.getRemoteStatus();

      // Clear all data if contract changed.
      const rca = await this.getLocalRollupContractAddress();
      if (rca && !rca.equals(rollupContractAddress)) {
        debug('Erasing database...');
        await this.leveldb.clear();
        await this.db.clear();
      }

      await this.db.addKey('rollupContractAddress', rollupContractAddress.toBuffer());

      // Initialize the "mutable" merkle tree. This is the tree that represents all layers about each rollup subtree.
      const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
      await this.worldState.init(subtreeDepth);

      this.sdkStatus = {
        ...this.sdkStatus,
        serverUrl: options.serverUrl,
        chainId,
        rollupContractAddress,
        verifierContractAddress,
        feePayingAssetIds,
        rollupSize,
        syncedToRollup: await this.getLocalSyncedToRollup(),
        latestRollupId: await this.rollupProvider.getLatestRollupId(),
        dataSize: this.worldState.getSize(),
        dataRoot: this.worldState.getRoot(),
        useKeyCache,
        proverless,
      };

      // Ensures we can get the list of users and access current known balances.
      await this.initUserStates();

      this.initState = SdkInitState.INITIALIZED;
      debug('initialization complete.');
    } catch (err) {
      debug('initialization failed: ', err);
      // If initialization fails, we should destroy the components we've taken ownership of.
      await this.leveldb.close();
      await this.db.close();
      await this.workerPool?.destroy();
      this.serialQueue?.cancel();
      throw err;
    }
  }

  public async destroy() {
    debug('destroying...');

    // If sync() task is running, signals it to stop, to awake for exit if it's asleep, and awaits the exit.
    this.initState = SdkInitState.STOPPING;
    this.syncSleep.interrupt();
    await this.synchingPromise;

    // The serial queue will cancel itself. This ensures that anything currently in the queue finishes, and ensures
    // that once the await to push() returns, nothing else is on, or can be added to the queue.
    await this.serialQueue.push(() => Promise.resolve(this.serialQueue.cancel()));

    // Stop listening to account state updates.
    this.userStates.forEach(us => us.removeAllListeners());

    // Destroy injected components.
    await this.fftFactory.destroy();
    await this.leveldb.close();
    await this.db.close();
    await this.workerPool?.destroy();

    this.initState = SdkInitState.DESTROYED;
    this.emit(SdkEvent.DESTROYED);
    this.removeAllListeners();

    debug('destroyed.');
  }

  public getLocalStatus() {
    return Promise.resolve({ ...this.sdkStatus });
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress, includePending: boolean) {
    return (
      !!(await this.db.getAlias(accountPublicKey)) ||
      (includePending && (await this.rollupProvider.isAccountRegistered(accountPublicKey)))
    );
  }

  public async isAliasRegistered(alias: string, includePending: boolean) {
    const aliasHash = this.computeAliasHash(alias);
    return (
      (await this.db.getAliases(aliasHash)).length > 0 ||
      (includePending && (await this.rollupProvider.isAliasRegistered(alias)))
    );
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string, includePending: boolean) {
    const aliasHash = this.computeAliasHash(alias);
    const savedAlias = await this.db.getAlias(accountPublicKey);
    return savedAlias
      ? savedAlias.aliasHash.equals(aliasHash)
      : includePending && (await this.rollupProvider.isAliasRegisteredToAccount(accountPublicKey, alias));
  }

  public async getAccountPublicKey(alias: string) {
    const aliasHash = this.computeAliasHash(alias);
    const aliases = await this.db.getAliases(aliasHash);
    return aliases[0]?.accountPublicKey;
  }

  public async getTxFees(assetId: number) {
    return await this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeId: BridgeId) {
    return await this.rollupProvider.getDefiFees(bridgeId);
  }

  public async getPendingDepositTxs() {
    return await this.rollupProvider.getPendingDepositTxs();
  }

  public async getDefiInteractionNonce(txId: TxId) {
    const tx = await this.db.getDefiTx(txId);
    if (!tx) {
      throw new Error('Unknown txId');
    }
    return tx.interactionNonce;
  }

  public async userExists(userId: GrumpkinAddress) {
    return !!(await this.db.getUser(userId));
  }

  public getUsers() {
    return Promise.resolve(this.userStates.map(us => us.getUserData().accountPublicKey));
  }

  public derivePublicKey(privateKey: Buffer) {
    return Promise.resolve(new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, privateKey)));
  }

  public constructSignature(message: Buffer, privateKey: Buffer) {
    return Promise.resolve(this.schnorr.constructSignature(message, privateKey));
  }

  public async addUser(accountPrivateKey: Buffer, noSync = false) {
    return await this.serialQueue.push(async () => {
      const accountPublicKey = await this.derivePublicKey(accountPrivateKey);
      if (await this.db.getUser(accountPublicKey)) {
        throw new Error(`User already exists: ${accountPublicKey}`);
      }

      const { latestRollupId } = this.sdkStatus;
      const syncedToRollup = noSync ? latestRollupId : -1;
      const user: UserData = { accountPrivateKey, accountPublicKey, syncedToRollup };
      await this.db.addUser(user);

      await this.addInitialUserSpendingKeys([user.accountPublicKey]);

      const userState = await this.userStateFactory.createUserState(user);
      userState.on(UserStateEvent.UPDATED_USER_STATE, id => this.emit(SdkEvent.UPDATED_USER_STATE, id));
      this.userStates.push(userState);

      this.emit(SdkEvent.UPDATED_USERS);

      if (!noSync) {
        // If the sync microtask is sleeping, wake it up to start syncing.
        this.syncSleep.interrupt();
      }

      return accountPublicKey;
    });
  }

  private async retrieveGenesisData() {
    const stored = await this.db.getGenesisData();
    if (stored.length) {
      return stored;
    }
    debug('genesis data not found locally, retrieving from server...');
    const serverData = await this.rollupProvider.getInitialWorldState();
    await this.db.setGenesisData(serverData.initialAccounts);
    return serverData.initialAccounts;
  }

  public async removeUser(userId: GrumpkinAddress) {
    return await this.serialQueue.push(async () => {
      const userState = this.getUserState(userId);
      this.userStates = this.userStates.filter(us => us !== userState);
      userState.removeAllListeners();
      await this.db.removeUser(userId);

      this.emit(SdkEvent.UPDATED_USERS);
    });
  }

  public getUserSyncedToRollup(userId: GrumpkinAddress) {
    return Promise.resolve(this.getUserState(userId).getUserData().syncedToRollup);
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    const keys = await this.db.getSpendingKeys(userId);
    return keys.map(k => k.key);
  }

  public getBalances(userId: GrumpkinAddress) {
    return Promise.resolve(this.getUserState(userId).getBalances());
  }

  public getBalance(userId: GrumpkinAddress, assetId: number) {
    const userState = this.getUserState(userId);
    return Promise.resolve(userState.getBalance(assetId));
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return await userState.getSpendableSum(assetId, spendingKeyRequired, excludePendingNotes);
  }

  public async getSpendableSums(userId: GrumpkinAddress, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    const userState = this.getUserState(userId);
    return await userState.getSpendableSums(spendingKeyRequired, excludePendingNotes);
  }

  public async getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    const userState = this.getUserState(userId);
    return await userState.getMaxSpendableValue(assetId, spendingKeyRequired, excludePendingNotes, numNotes);
  }

  public async pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.getUserState(userId).pickNotes(assetId, value, spendingKeyRequired, excludePendingNotes);
  }

  public async pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.getUserState(userId).pickNote(assetId, value, spendingKeyRequired, excludePendingNotes);
  }

  public async getUserTxs(userId: GrumpkinAddress) {
    return await this.db.getUserTxs(userId);
  }

  /**
   * Moves the sdk into RUNNING state.
   * Kicks off data tree updates, user note decryptions, alias table updates, proving key construction.
   */
  public run() {
    if (this.initState === SdkInitState.RUNNING) {
      return Promise.resolve();
    }

    this.initState = SdkInitState.RUNNING;

    this.serialQueue
      .push(async () => {
        const { useKeyCache: localUseKeyCache } = this.options;

        const { proverless, verifierContractAddress, useKeyCache } = this.sdkStatus;

        const vca = await this.getLocalVerifierContractAddress();
        const forceCreateProvingKeys =
          (vca && !vca.equals(verifierContractAddress)) || !useKeyCache || !localUseKeyCache;

        const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
        const crsData = await this.getCrsData(maxCircuitSize);

        await this.pippenger.init(crsData);
        await this.genesisSync();
        this.startReceivingBlocks();
        await this.createJoinSplitProofCreator(forceCreateProvingKeys, proverless);
        await this.createAccountProofCreator(forceCreateProvingKeys, proverless);

        // Makes the saved proving keys considered valid. Hence set this after they're saved.
        await this.db.addKey('verifierContractAddress', verifierContractAddress.toBuffer());
      })
      .catch(err => {
        debug('failed to run:', err);
        return this.destroy();
      });

    return Promise.resolve();
  }

  // -------------------------------------------------------
  // PUBLIC METHODS FROM HERE ON REQUIRE run() TO BE CALLED.
  // -------------------------------------------------------

  public async createDepositProof(
    assetId: number,
    publicInput: bigint,
    privateOutput: bigint,
    depositor: EthAddress,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired: boolean,
    txRefNo: number,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      // Create a one time user to generate and sign the proof.
      const accountPrivateKey = randomBytes(32);
      const accountPublicKey = await this.derivePublicKey(accountPrivateKey);
      const user: UserData = {
        accountPrivateKey,
        accountPublicKey,
        syncedToRollup: -1,
      };
      const signer = new SchnorrSigner(this, accountPublicKey, accountPrivateKey);
      const spendingPublicKey = accountPublicKey;

      const proofInput = await this.paymentProofCreator.createProofInput(
        user,
        [], // notes
        BigInt(0), // privateInput
        privateOutput,
        BigInt(0), // senderPrivateOutput
        publicInput,
        BigInt(0), // publicOutput
        assetId,
        recipient,
        recipientSpendingKeyRequired,
        depositor,
        spendingPublicKey,
        0, // allowChain
      );
      const signature = await signer.signMessage(proofInput.signingData);

      return this.paymentProofCreator.createProof(user, { ...proofInput, signature }, txRefNo);
    });
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
    recipientSpendingKeyRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const userState = this.getUserState(userId);
      const user = userState.getUserData();

      const spendingKeyRequired = !spendingPublicKey.equals(userId);
      const notes = privateInput ? await userState.pickNotes(assetId, privateInput, spendingKeyRequired) : [];
      if (privateInput && !notes.length) {
        throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
      }

      return this.paymentProofCreator.createProofInput(
        user,
        notes,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        publicInput,
        publicOutput,
        assetId,
        noteRecipient,
        recipientSpendingKeyRequired,
        publicOwner,
        spendingPublicKey,
        allowChain,
      );
    });
  }

  public async createPaymentProof(input: JoinSplitProofInput, txRefNo: number) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return await this.paymentProofCreator.createProof(user, input, txRefNo);
    });
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
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = this.computeAliasHash(alias);
      const { signingData } = await this.accountProofCreator.createProofInput(
        accountPublicKey,
        aliasHash,
        migrate,
        spendingPublicKey,
        newAccountPublicKey,
        newSpendingPublicKey1,
        newSpendingPublicKey2,
        false, // spendingKeyExists
      );
      return signingData;
    });
  }

  public async createAccountProofInput(
    userId: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const aliasHash = this.computeAliasHash(alias);
      const newAccountPublicKey = newAccountPrivateKey ? await this.derivePublicKey(newAccountPrivateKey) : undefined;
      return await this.accountProofCreator.createProofInput(
        userId,
        aliasHash,
        migrate,
        spendingPublicKey,
        newAccountPublicKey,
        newSpendingPublicKey1,
        newSpendingPublicKey2,
      );
    });
  }

  public async createAccountProof(input: AccountProofInput, txRefNo: number) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      return await this.accountProofCreator.createProof(input, txRefNo);
    });
  }

  public async createDefiProofInput(
    userId: GrumpkinAddress,
    bridgeId: BridgeId,
    depositValue: bigint,
    inputNotes: Note[],
    spendingPublicKey: GrumpkinAddress,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return await this.defiDepositProofCreator.createProofInput(
        user,
        bridgeId,
        depositValue,
        inputNotes,
        spendingPublicKey,
      );
    });
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      return await this.defiDepositProofCreator.createProof(user, input, txRefNo);
    });
  }

  public async sendProofs(proofs: ProofOutput[]) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const txs = proofs.map(({ proofData, offchainTxData, signature }) => ({
        proofData: proofData.rawProofData,
        offchainTxData: offchainTxData.toBuffer(),
        depositSignature: signature,
      }));
      const txIds = await this.rollupProvider.sendTxs(txs);

      for (const proof of proofs) {
        const { userId } = proof.tx;
        try {
          await this.getUserState(userId).addProof(proof);
        } catch (e) {
          // Proof sender is not added.
        }

        // Add the payment proof to recipient's account if they are not the sender.
        if ([ProofId.DEPOSIT, ProofId.SEND].includes(proof.tx.proofId)) {
          const recipient = proof.outputNotes[0].owner;
          if (!recipient.equals(userId)) {
            const recipientTx = createCorePaymentTxForRecipient(proof.tx as CorePaymentTx, recipient);
            try {
              await this.getUserState(recipient).addProof({ ...proof, tx: recipientTx });
            } catch (e) {
              // Recipient's account is not added.
            }
          }
        }
      }

      return txIds;
    });
  }

  public async awaitSynchronised(timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await retryUntil(() => this.isSynchronised(), 'data synchronised', timeout);
  }

  public isUserSynching(userId: GrumpkinAddress) {
    this.assertInitState(SdkInitState.RUNNING);

    return Promise.resolve(!this.getUserState(userId).isSynchronised(this.sdkStatus.latestRollupId));
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await this.getUserState(userId).awaitSynchronised(this.sdkStatus.latestRollupId, timeout);
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    await retryUntil(() => this.db.isUserTxSettled(txId), `tx settlement: ${txId}`, timeout);
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiDepositCompleted = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.settled;
    };
    await retryUntil(defiDepositCompleted, `defi interaction: ${txId}`, timeout);
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiFinalised = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.finalised;
    };
    await retryUntil(defiFinalised, `defi finalisation: ${txId}`, timeout);
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    this.assertInitState(SdkInitState.RUNNING);

    const defiSettled = async () => {
      const tx = await this.db.getDefiTx(txId);
      if (!tx) {
        throw new Error('Unknown txId.');
      }

      return !!tx.claimSettled;
    };
    await retryUntil(defiSettled, `defi settlement: ${txId}`, timeout);
  }

  // ---------------
  // PRIVATE METHODS
  // ---------------

  private getUserState(userId: GrumpkinAddress) {
    const userState = this.userStates.find(us => us.getUserData().accountPublicKey.equals(userId));
    if (!userState) {
      throw new Error(`User not found: ${userId}`);
    }
    return userState;
  }

  private isSynchronised() {
    return this.sdkStatus.syncedToRollup === this.sdkStatus.latestRollupId;
  }

  private assertInitState(state: SdkInitState) {
    if (this.initState !== state) {
      throw new Error(`Init state ${this.initState} !== ${state}`);
    }
  }

  private async getLocalRollupContractAddress() {
    const result = await this.db.getKey('rollupContractAddress');
    return result ? new EthAddress(result) : undefined;
  }

  private async getLocalVerifierContractAddress() {
    const result = await this.db.getKey('verifierContractAddress');
    return result ? new EthAddress(result) : undefined;
  }

  private async getLocalSyncedToRollup() {
    return +(await this.leveldb.get('syncedToRollup').catch(() => -1));
  }

  private async getCrsData(circuitSize: number) {
    debug('downloading crs data...');
    const crs = new Crs(circuitSize);
    await crs.download();
    debug('done.');
    return Buffer.from(crs.getData());
  }

  /**
   * Loads known accounts from db.
   * Registers to forward any notifications of account state updates.
   */
  private async initUserStates() {
    debug('initializing user states...');
    const users = await this.db.getUsers();
    await this.addInitialUserSpendingKeys(users.map(x => x.accountPublicKey));
    this.userStates = await Promise.all(users.map(u => this.userStateFactory.createUserState(u)));
    this.userStates.forEach(us =>
      us.on(UserStateEvent.UPDATED_USER_STATE, id => this.emit(SdkEvent.UPDATED_USER_STATE, id)),
    );
  }

  private async addInitialUserSpendingKeys(userIds: GrumpkinAddress[]) {
    if (!userIds.length) {
      return;
    }
    const genesisAccountsData = await this.retrieveGenesisData();
    if (genesisAccountsData.length) {
      const spendingKeys = await getUserSpendingKeysFromGenesisData(
        userIds,
        genesisAccountsData,
        this.pedersen,
        this.sdkStatus.rollupSize,
      );
      debug(`found ${spendingKeys.length} spending keys for user${userIds.length == 1 ? '' : 's'}`);
      if (spendingKeys.length) {
        await this.db.addSpendingKeys(spendingKeys);
      }
    }
  }

  private computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  private async createJoinSplitProofCreator(recreateKeys: boolean, proverless: boolean) {
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
    await joinSplitProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving join-split proving key...');
      const newProvingKey = await joinSplitProver.getKey();
      await this.db.addKey('join-split-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('join-split-proving-key');
    }
    debug(`done.`);
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
    await accountProver.computeKey();
    if (this.options.useKeyCache) {
      debug('saving account proving key...');
      const newProvingKey = await accountProver.getKey();
      await this.db.addKey('account-proving-key', newProvingKey);
    } else {
      await this.db.deleteKey('account-proving-key');
    }
    debug(`done.`);
  }
  /**
   * If the world state has no data, download the initial world state data and process it.
   */
  private async genesisSync(commitmentsOnly = false) {
    if (this.worldState.getSize() > 0) {
      return;
    }

    debug('initializing genesis state from server...');
    const genesisTimer = new Timer();
    const initialState = await this.rollupProvider.getInitialWorldState();
    debug(
      `received genesis state with ${initialState.initialAccounts.length} bytes and ${initialState.initialSubtreeRoots.length} sub-tree roots`,
    );
    await this.db.setGenesisData(initialState.initialAccounts);
    await this.worldState.insertElements(0, initialState.initialSubtreeRoots);
    if (!commitmentsOnly) {
      const accounts = InitHelpers.parseAccountTreeData(initialState.initialAccounts);
      const genesisData = parseGenesisAliasesAndKeys(accounts);
      debug(`storing aliases to db...`);
      await this.db.addAliases(genesisData.aliases);
    }
    debug(`genesis sync complete in ${genesisTimer.s()}s`);
  }

  /**
   * Starts a micro task that repeatedly calls sync() on the serial queue.
   * sync() will only process so much data at a time. We sleep for 10s between calls only if we're fully synched.
   * If we're not fully synched, we loop around immediately to process more data.
   * This mechanism ensures we don't starve servicing the serial queue for long periods of time.
   * Will return once destroy() is called and the state shifts to STOPPING.
   */
  private startReceivingBlocks() {
    this.synchingPromise = (async () => {
      debug('starting sync task...');
      while (this.initState !== SdkInitState.STOPPING) {
        const timer = new Timer();
        try {
          await this.serialQueue.push(() => this.sync());
        } catch (err) {
          debug('sync() failed:', err);
          await this.syncSleep.sleep(10000);
        }
        if (this.isSynchronised() && this.userStates.every(us => us.isSynchronised(this.sdkStatus.latestRollupId))) {
          await this.syncSleep.sleep(this.options.pollInterval || 10000);
        } else if (timer.s() < 1) {
          // Ensure that at least 1s has passed before we loop around again.
          await this.syncSleep.sleep(1000);
        }
      }
      debug('stopped sync task.');
    })();
  }

  /**
   * Called when data root is not as expected. We need to erase the db and rebuild the merkle tree.
   */
  private async reinitDataTree() {
    debug('re-initializing data tree...');

    await this.leveldb.clear();

    const subtreeDepth = Math.ceil(
      Math.log2(this.sdkStatus.rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX),
    );
    await this.worldState.init(subtreeDepth);
    await this.genesisSync(true);
  }

  /**
   * Every time called, determine the lowest `from` block, and download and process the next chunk of blocks.
   * Will always first bring the data tree into sync, and then forward the blocks onto user states.
   * This is always called on the serial queue.
   */
  private async sync() {
    // Persistent data could have changed underfoot. Ensure this.sdkStatus and user states are up to date first.
    await this.readSyncInfo();
    await Promise.all(this.userStates.map(us => us.syncFromDb()));

    const { syncedToRollup } = this.sdkStatus;
    const from = syncedToRollup + 1;

    // First we focus on bringing the core in sync (mutable data tree layers and accounts).
    // Server will return a chunk of blocks.
    const timer = new Timer();
    debug(`fetching blocks from ${from}...`);
    const coreBlocks = await this.rollupProvider.getBlocks(from);
    if (coreBlocks.length) {
      debug(`creating contexts for blocks ${from} to ${from + coreBlocks.length - 1}...`);
    }
    const coreBlockContexts = coreBlocks.map(b => BlockContext.fromBlock(b, this.pedersen));

    if (coreBlocks.length) {
      // For debugging corrupted data root.
      const oldRoot = this.worldState.getRoot();

      const rollups = coreBlockContexts.map(b => b.rollup);
      const offchainTxData = coreBlocks.map(b => b.offchainTxData);
      const subtreeRoots = coreBlocks.map(block => block.subtreeRoot!);
      debug(`inserting ${subtreeRoots.length} rollup roots into data tree...`);
      await this.worldState.insertElements(rollups[0].dataStartIndex, subtreeRoots);
      debug(`processing aliases...`);
      await this.processAliases(rollups, offchainTxData);
      await this.writeSyncInfo(rollups[rollups.length - 1].rollupId);

      // TODO: Ugly hotfix. Find root cause.
      // We expect our data root to be equal to the new data root in the last block we processed.
      // UPDATE: Possibly solved. But leaving in for now. Can monitor for clientLogs.
      const expectedDataRoot = rollups[rollups.length - 1].newDataRoot;
      const newRoot = this.worldState.getRoot();
      if (!newRoot.equals(expectedDataRoot)) {
        const newSize = this.worldState.getSize();
        await this.reinitDataTree();
        await this.writeSyncInfo(-1);
        await this.rollupProvider.clientLog({
          message: 'Invalid dataRoot.',
          synchingFromRollup: syncedToRollup,
          blocksReceived: coreBlocks.length,
          oldRoot: oldRoot.toString('hex'),
          newRoot: newRoot.toString('hex'),
          newSize,
          expectedDataRoot: expectedDataRoot.toString('hex'),
        });
        return;
      }

      debug(`forwarding blocks to user states...`);
      await Promise.all(this.userStates.map(us => us.processBlocks(coreBlockContexts)));

      debug(`finished processing blocks ${from} to ${from + coreBlocks.length - 1} in ${timer.s()}s...`);
    }

    // Secondly we want bring user states in sync. Determine the lowest block.
    const userSyncedToRollup = Math.min(...this.userStates.map(us => us.getUserData().syncedToRollup));

    // If it's lower than we downloaded for core, fetch and process blocks.
    if (userSyncedToRollup < syncedToRollup) {
      const timer = new Timer();
      const from = userSyncedToRollup + 1;
      debug(`fetching blocks from ${from} for user states...`);
      const userBlocks = await this.rollupProvider.getBlocks(from);
      debug(`creating contexts for blocks ${from} to ${from + userBlocks.length - 1}...`);
      const userBlockContexts = userBlocks.map(b => BlockContext.fromBlock(b, this.pedersen));
      debug(`forwarding blocks to user states...`);
      await Promise.all(this.userStates.map(us => us.processBlocks(userBlockContexts)));
      debug(`finished processing user state blocks ${from} to ${from + coreBlocks.length - 1} in ${timer.s()}s...`);
    }
  }

  /**
   * Brings this.sdkStatus, in line with whats persisted.
   */
  private async readSyncInfo() {
    const syncedToRollup = await this.getLocalSyncedToRollup();
    const latestRollupId = await this.rollupProvider.getLatestRollupId();
    this.sdkStatus.latestRollupId = latestRollupId;

    if (this.sdkStatus.syncedToRollup < syncedToRollup) {
      await this.worldState.syncFromDb();
      this.sdkStatus.syncedToRollup = syncedToRollup;
      this.sdkStatus.dataRoot = this.worldState.getRoot();
      this.sdkStatus.dataSize = this.worldState.getSize();
      this.emit(SdkEvent.UPDATED_WORLD_STATE, syncedToRollup, latestRollupId);
    }
  }

  /**
   * Persist new syncedToRollup and update this.sdkStatus.
   */
  private async writeSyncInfo(syncedToRollup: number) {
    await this.leveldb.put('syncedToRollup', syncedToRollup.toString());

    this.sdkStatus.syncedToRollup = syncedToRollup;
    this.sdkStatus.dataRoot = this.worldState.getRoot();
    this.sdkStatus.dataSize = this.worldState.getSize();

    this.emit(SdkEvent.UPDATED_WORLD_STATE, syncedToRollup, this.sdkStatus.latestRollupId);
  }

  private async processAliases(rollups: RollupProofData[], offchainTxData: Buffer[][]) {
    const processRollup = (rollup: RollupProofData, offchainData: Buffer[]) => {
      const aliases: Alias[] = [];
      let offchainIndex = -1;
      for (let i = 0; i < rollup.innerProofData.length; ++i) {
        const proof = rollup.innerProofData[i];
        if (proof.isPadding()) {
          continue;
        }

        offchainIndex++;

        if (proof.proofId !== ProofId.ACCOUNT) {
          continue;
        }

        const createOrMigrate = !!toBigIntBE(proof.nullifier2);
        if (createOrMigrate) {
          const { accountPublicKey, aliasHash, spendingPublicKey1 } = OffchainAccountData.fromBuffer(
            offchainData[offchainIndex],
          );
          const commitment = this.noteAlgos.accountNoteCommitment(aliasHash, accountPublicKey, spendingPublicKey1);
          // Only need to check one commitment to make sure the aliasHash and accountPublicKey pair is valid.
          if (commitment.equals(proof.noteCommitment1)) {
            aliases.push({
              accountPublicKey,
              aliasHash,
              index: rollup.dataStartIndex + i * 2,
            });
          }
        }
      }
      return aliases;
    };

    const aliases = rollups.map((rollup, i) => processRollup(rollup, offchainTxData[i])).flat();
    await this.db.addAliases(aliases);
  }
}

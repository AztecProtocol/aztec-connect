import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { DecodedBlock } from '@aztec/barretenberg/block_source';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { AccountProver, JoinSplitProver, ProofId } from '@aztec/barretenberg/client_proofs';
import { NetCrs } from '@aztec/barretenberg/crs';
import { Blake2s, keccak256, Pedersen, randomBytes, Schnorr } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { FftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger, logHistory } from '@aztec/barretenberg/log';
import { NoteAlgorithms, NoteDecryptor } from '@aztec/barretenberg/note_algorithms';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { retryUntil } from '@aztec/barretenberg/retry';
import { BridgePublishQuery, BridgePublishQueryResult, RollupProvider, Tx } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import isNode from 'detect-node';
import { EventEmitter } from 'events';
import { LevelUp } from 'levelup';
import { KeyPairAuthAlgorithms } from '../auth_algorithms/key_pair_auth_algorithms.js';
import { sendClientLog, sendClientConsoleLog } from '../client_log/client_log.js';
import { CorePaymentTx, createCorePaymentTxForRecipient } from '../core_tx/index.js';
import { Database } from '../database/index.js';
import { getUserSpendingKeysFromGenesisData } from '../genesis_state/index.js';
import { getDeviceMemory } from '../get_num_workers/index.js';
import { ConstantKeyPair } from '../key_pair/index.js';
import { VERSION_HASH } from '../package_version.js';
import {
  AccountProofInput,
  JoinSplitProofInput,
  joinSplitTxInputToJoinSplitTx,
  joinSplitTxToJoinSplitTxInput,
  ProofOutput,
} from '../proofs/index.js';
import { DefiProofInput, PaymentProofInput, ProofInputFactory } from '../proofs/proof_input/index.js';
import { ProofOutputFactory } from '../proofs/proof_output/index.js';
import { ProofRequestDataFactory } from '../proofs/proof_request_data/index.js';
import { MutexSerialQueue, SerialQueue } from '../serial_queue/index.js';
import { SchnorrSigner } from '../signer/index.js';
import { UserData } from '../user/index.js';
import { UserState, UserStateEvent, UserStateFactory } from '../user_state/index.js';
import { CoreSdkOptions } from './core_sdk_options.js';
import { SdkEvent, SdkStatus } from './sdk_status.js';
import { sdkVersion } from './sdk_version.js';
import { Synchroniser } from './synchroniser.js';

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
export class CoreSdk extends EventEmitter {
  private dataVersion = 1;
  private worldState!: WorldState;
  private userStates: UserState[] = [];
  private proofRequestDataFactory!: ProofRequestDataFactory;
  private proofInputFactory!: ProofInputFactory;
  private proofOutputFactory!: ProofOutputFactory;
  private serialQueue!: SerialQueue;
  private broadcastChannel: BroadcastChannel | undefined = isNode ? undefined : new BroadcastChannel('aztec-sdk');
  private userStateFactory!: UserStateFactory;
  private sdkStatus: SdkStatus = {
    serverUrl: '',
    chainId: -1,
    rollupContractAddress: EthAddress.ZERO,
    permitHelperContractAddress: EthAddress.ZERO,
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
  private debug = createDebugLogger('bb:core_sdk');
  private synchroniser: Synchroniser;

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

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = ({ data: { event, args } }) => {
        if (event === SdkEvent.UPDATED_USER_STATE) {
          this.emit(SdkEvent.UPDATED_USER_STATE, GrumpkinAddress.fromString(args[0]));
        }
      };
    }
    this.rollupProvider.on('versionMismatch', error => {
      this.debug(error);
      this.emit(SdkEvent.VERSION_MISMATCH);
    });

    this.serialQueue = new MutexSerialQueue(this.db, 'aztec_core_sdk', 30000);
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

    this.synchroniser = new Synchroniser(rollupProvider, this.worldState, leveldb, db, pedersen, this.serialQueue);
    this.synchroniser.on(SdkEvent.UPDATED_WORLD_STATE, syncStatus => {
      this.sdkStatus = {
        ...this.sdkStatus,
        ...syncStatus,
      };
      this.emit(SdkEvent.UPDATED_WORLD_STATE, this.sdkStatus.syncedToRollup, this.sdkStatus.latestRollupId);
    });
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
      this.debug(`initializing...${sdkVersion ? ` (version: ${sdkVersion})` : ''}`);
      this.debug(`Version hash: ${VERSION_HASH}`);

      const {
        blockchainStatus: { chainId, rollupContractAddress, permitHelperContractAddress, verifierContractAddress },
        runtimeConfig: { feePayingAssetIds, useKeyCache },
        rollupSize,
        proverless,
      } = await this.getRemoteStatus();

      // Clear all data if contract changed or dataVersion changed.
      const rca = await this.getLocalRollupContractAddress();
      const localDataVersion = await this.getLocalDataVersion();
      if ((rca && !rca.equals(rollupContractAddress)) || localDataVersion !== this.dataVersion) {
        this.debug('erasing database...');
        await this.leveldb.clear();
        await this.db.clear();
        await this.setLocalDataVersion(this.dataVersion);
      }

      await this.db.addKey('rollupContractAddress', rollupContractAddress.toBuffer());

      // Initialize the "mutable" merkle tree. This is the tree that represents all layers about each rollup subtree.
      const subtreeDepth = Math.ceil(Math.log2(rollupSize * WorldStateConstants.NUM_NEW_DATA_TREE_NOTES_PER_TX));
      await this.worldState.init(subtreeDepth);

      await this.synchroniser.init();

      this.sdkStatus = {
        ...this.sdkStatus,
        ...this.synchroniser.getSyncStatus(),
        serverUrl: options.serverUrl,
        chainId,
        rollupContractAddress,
        permitHelperContractAddress,
        verifierContractAddress,
        feePayingAssetIds,
        rollupSize,
        useKeyCache,
        proverless,
      };

      this.proofRequestDataFactory = new ProofRequestDataFactory(this.worldState, this.db, this.blake2s);
      this.proofInputFactory = new ProofInputFactory(this.noteAlgos, this.grumpkin, this.pedersen, this.barretenberg);
      this.proofOutputFactory = new ProofOutputFactory(
        proverless,
        this.noteAlgos,
        this.pippenger,
        this.fftFactory,
        this.barretenberg,
        this.workerPool,
      );

      // Ensures we can get the list of users and access current known balances.
      await this.initUserStates();

      this.initState = SdkInitState.INITIALIZED;
      this.debug('initialization complete.');
    } catch (err) {
      this.debug('initialization failed: ', err);
      // If initialization fails, we should destroy the components we've taken ownership of.
      await this.leveldb.close();
      await this.db.close();
      await this.workerPool?.destroy();
      this.serialQueue?.cancel();
      throw err;
    }
  }

  public async destroy() {
    this.debug('destroying...');

    // If sync() task is running, signals it to stop, to awake for exit if it's asleep, and awaits the exit.
    this.initState = SdkInitState.STOPPING;
    await this.synchroniser.stop();

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

    // Destroy components.
    this.broadcastChannel?.close();

    this.initState = SdkInitState.DESTROYED;
    this.emit(SdkEvent.DESTROYED);
    this.removeAllListeners();

    this.debug('destroyed.');
  }

  public getLocalStatus() {
    return Promise.resolve({ ...this.sdkStatus });
  }

  public async getRemoteStatus() {
    return await this.rollupProvider.getStatus();
  }

  public async sendConsoleLog(clientData?: string[], preserveLog?: boolean) {
    const logs = logHistory.getLogs();
    if (!logs.length && !clientData?.length) {
      return;
    }

    const publicKeys = this.userStates.map(us => us.getUserData().accountPublicKey);
    const ensureJson = (log: any[]) =>
      log.map(logArgs => {
        try {
          JSON.stringify(logArgs);
          return logArgs;
        } catch (e) {
          return `${logArgs}`;
        }
      });
    await sendClientConsoleLog(this.rollupProvider, {
      publicKeys: publicKeys.map(k => k.toString()),
      logs: logs.map(ensureJson),
      clientData,
      clientUrl: location?.href,
    });
    if (!preserveLog) {
      logHistory.clear(logs.length);
    }
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
      (await this.db.getAliasByAliasHash(aliasHash)) !== undefined ||
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
    const dbAlias = await this.db.getAliasByAliasHash(aliasHash);

    if (!dbAlias) {
      return;
    }

    const { accountPublicKey, noteCommitment1, spendingPublicKeyX } = dbAlias;
    // If there is an entry in the address book for the recipient, that has both the note commitment and spending
    // key x coordinate, then we need to validate the data hashes to the account note commitment. This allows us
    // to skip computing the commitment for every single alias when synching. Rather we just do it on send.
    if (noteCommitment1 && spendingPublicKeyX) {
      // We only stored the X coordinate, and it's the only thing needed. Pad the Y coordinate.
      const spendingPublicKey = Buffer.concat([spendingPublicKeyX, Buffer.alloc(32)]);
      const commitment = this.noteAlgos.accountNoteCommitment(aliasHash, accountPublicKey, spendingPublicKey);
      if (!commitment.equals(noteCommitment1)) {
        throw new Error('Failed to validate account note commitment for recipient.');
      }
    }

    return accountPublicKey;
  }

  public async getAccountIndex(alias: string) {
    const aliasHash = this.computeAliasHash(alias);
    const result = await this.db.getAliasByAliasHash(aliasHash);
    return result?.index;
  }

  public async getTxFees(assetId: number) {
    return await this.rollupProvider.getTxFees(assetId);
  }

  public async getDefiFees(bridgeCallData: BridgeCallData) {
    return await this.rollupProvider.getDefiFees(bridgeCallData);
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
    return Promise.resolve(new GrumpkinAddress(this.grumpkin.mul(Grumpkin.generator, privateKey)));
  }

  public deriveLegacySigningMessageHash(address: EthAddress) {
    const signingMessage = this.blake2s.hashToField(address.toBuffer());
    return Promise.resolve(keccak256(signingMessage));
  }

  public constructSignature(message: Buffer, privateKey: Buffer) {
    return Promise.resolve(this.schnorr.constructSignature(message, privateKey));
  }

  public async addUser(accountPrivateKey: Buffer, registrationSync = false, registrationSyncMarginBlocks = 10) {
    let shouldResync = true;
    const accountPublicKey = await this.derivePublicKey(accountPrivateKey);

    await this.serialQueue.push(async () => {
      if (await this.db.getUser(accountPublicKey)) {
        throw new Error(`User already exists: ${accountPublicKey}`);
      }

      let syncedToRollup = -1;

      if (registrationSync) {
        const { latestRollupId } = this.sdkStatus;
        const registrationRollupId = await this.rollupProvider.getAccountRegistrationRollupId(accountPublicKey);

        if (registrationRollupId !== -1) {
          const startingPoint = registrationRollupId - registrationSyncMarginBlocks;
          syncedToRollup = startingPoint < -1 ? -1 : startingPoint;
          this.debug(
            `Adding registrationSync account registered at ${registrationRollupId}, synching from ${syncedToRollup}`,
          );
        } else {
          shouldResync = false;
          syncedToRollup = latestRollupId;
        }
      }

      const user: UserData = { accountPrivateKey, accountPublicKey, syncedToRollup };
      await this.db.addUser(user);

      await this.addInitialUserSpendingKeys([user.accountPublicKey]);

      const userState = await this.userStateFactory.createUserState(user);
      userState.on(UserStateEvent.UPDATED_USER_STATE, id => {
        this.emit(SdkEvent.UPDATED_USER_STATE, id);
        this.broadcastChannel?.postMessage({
          event: SdkEvent.UPDATED_USER_STATE,
          args: [id.toString()],
        });
      });
      this.userStates = [...this.userStates, userState];
      this.synchroniser.setUserStates(this.userStates);
    });

    // If this account is already registered, we need to restart syncing from registration
    // It cannot be done in the serial queue as synchroniser.stop can deadlock
    if (shouldResync && this.initState == SdkInitState.RUNNING) {
      await this.synchroniser.stop();
      await this.synchroniser.start();
    }

    return accountPublicKey;
  }

  public async removeUser(userId: GrumpkinAddress) {
    return await this.serialQueue.push(async () => {
      const userState = this.getUserState(userId);
      this.userStates = this.userStates.filter(us => us !== userState);
      this.synchroniser.setUserStates(this.userStates);
      await userState.shutdown();
      userState.removeAllListeners();
      await this.db.removeUser(userId);
    });
  }

  public getUserSyncedToRollup(userId: GrumpkinAddress) {
    return Promise.resolve(this.getUserState(userId).getUserData().syncedToRollup);
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    const keys = await this.db.getSpendingKeys(userId);
    return keys.map(k => k.key);
  }

  public async getBalances(userId: GrumpkinAddress) {
    return await this.getUserState(userId).getBalances();
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number) {
    const userState = this.getUserState(userId);
    return await userState.getBalance(assetId);
  }

  public async getSpendableNoteValues(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return await userState.getSpendableNoteValues(assetId, { spendingKeyRequired, excludePendingNotes });
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    const userState = this.getUserState(userId);
    return await userState.getSpendableSum(assetId, { spendingKeyRequired, excludePendingNotes });
  }

  public async getSpendableSums(userId: GrumpkinAddress, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    const userState = this.getUserState(userId);
    return await userState.getSpendableSums({ spendingKeyRequired, excludePendingNotes });
  }

  public async getMaxSpendableNoteValues(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    const userState = this.getUserState(userId);
    return await userState.getMaxSpendableNoteValues(assetId, { spendingKeyRequired, excludePendingNotes, numNotes });
  }

  public async pickNotes(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.getUserState(userId).pickNotes(assetId, value, { spendingKeyRequired, excludePendingNotes });
  }

  public async pickNote(
    userId: GrumpkinAddress,
    assetId: number,
    value: bigint,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.getUserState(userId).pickNote(assetId, value, { spendingKeyRequired, excludePendingNotes });
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
        const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
        const crsData = await this.getCrsData(maxCircuitSize);
        await this.pippenger.init(crsData);

        await this.synchroniser.start();
        this.synchroniser.onAbort(err => {
          this.debug('failed to sync:', err);
          void this.destroy();
        });
      })
      .catch(err => {
        this.debug('failed to run:', err);
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
    timeout?: number,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      // Create a one time user to generate and sign the proof.
      const accountPrivateKey = randomBytes(32);
      const accountPublicKey = await this.derivePublicKey(accountPrivateKey);
      const spendingPublicKey = accountPublicKey;

      const depositValue = privateOutput;
      const feeValue = publicInput - privateOutput;
      const proofRequestData = await this.proofRequestDataFactory.createPaymentProofRequestData(
        ProofId.DEPOSIT,
        accountPublicKey,
        spendingPublicKey,
        { assetId, value: depositValue },
        { assetId, value: feeValue },
        depositor,
        recipient,
        recipientSpendingKeyRequired,
      );

      const accountKeyPair = new ConstantKeyPair(accountPublicKey, accountPrivateKey, this.schnorr);
      const authAlgos = new KeyPairAuthAlgorithms(
        accountKeyPair,
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.barretenberg,
      );
      const proofInput = (
        await this.proofInputFactory.createProofInputs(proofRequestData, authAlgos)
      )[0] as PaymentProofInput;

      const signer = new SchnorrSigner(this, accountPublicKey, accountPrivateKey);
      const signature = await signer.signMessage(proofInput.signingData);

      return this.runOrClientLog(
        () => this.proofOutputFactory.createPaymentProof(proofInput, signature, txRefNo, accountKeyPair, timeout),
        'Failed to create deposit proof.',
      );
    });
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
  ): Promise<JoinSplitProofInput[]> {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const userState = this.getUserState(userId);
      const user = userState.getUserData();

      const proofId = (() => {
        if (publicInput > 0) {
          return ProofId.DEPOSIT;
        }
        if (publicOutput > 0) {
          return ProofId.WITHDRAW;
        }
        return ProofId.SEND;
      })();

      const value = (() => {
        if (publicInput > 0) {
          return publicInput;
        }
        if (publicOutput > 0) {
          return publicOutput;
        }
        return recipientPrivateOutput;
      })();

      const feeValue = publicInput + privateInput - (publicOutput + recipientPrivateOutput + senderPrivateOutput);

      const proofRequestData = await this.proofRequestDataFactory.createPaymentProofRequestData(
        proofId,
        userId,
        spendingPublicKey,
        { assetId, value },
        { assetId, value: feeValue },
        publicOwner || EthAddress.ZERO,
        noteRecipient || GrumpkinAddress.generator(),
        recipientSpendingKeyRequired,
        userState,
        { allowChain: !!allowChain },
      );

      const accountKeyPair = new ConstantKeyPair(user.accountPublicKey, user.accountPrivateKey, this.schnorr);
      const authAlgos = new KeyPairAuthAlgorithms(
        accountKeyPair,
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.barretenberg,
      );
      const proofInputs = (await this.proofInputFactory.createProofInputs(proofRequestData, authAlgos)).map(
        proofInput => {
          const { tx, viewingKeys, signingData } = proofInput as PaymentProofInput;
          return {
            tx: joinSplitTxInputToJoinSplitTx(tx, user.accountPrivateKey, user.accountPublicKey),
            viewingKeys,
            signingData,
          };
        },
      );
      return proofInputs;
    });
  }

  public async createPaymentProof(input: JoinSplitProofInput, txRefNo: number, timeout?: number): Promise<ProofOutput> {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { outputNotes } = input.tx;
      const userId = outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      const accountKeyPair = new ConstantKeyPair(user.accountPublicKey, user.accountPrivateKey, this.schnorr);

      return await this.runOrClientLog(
        () =>
          this.proofOutputFactory.createPaymentProof(
            { ...input, tx: joinSplitTxToJoinSplitTxInput(input.tx, user.accountPrivateKey, this.noteAlgos) },
            input.signature!,
            txRefNo,
            accountKeyPair,
            timeout,
          ),
        'Failed to create payment proof.',
      );
    });
  }

  public async createAccountProofSigningData(
    accountPublicKey: GrumpkinAddress,
    alias: string,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newAccountPublicKey = accountPublicKey,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
  ) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const proofRequestData = await this.proofRequestDataFactory.createAccountProofRequestData(
        accountPublicKey,
        accountPublicKey, // set the accountPublicKey as spendingPublicKey so the factory won't fetch its hash path.
        alias || '',
        newAccountPublicKey,
        newSpendingPublicKey1 || GrumpkinAddress.ZERO,
        newSpendingPublicKey2 || GrumpkinAddress.ZERO,
        { assetId: 0, value: BigInt(0) }, // deposit
        { assetId: 0, value: BigInt(0) }, // fee
        EthAddress.ZERO, // depositor
      );

      const randomAccountPrivateKey = randomBytes(32);
      const randomAccountPublicKey = await this.derivePublicKey(randomAccountPrivateKey);
      const accountKeyPair = new ConstantKeyPair(randomAccountPublicKey, randomAccountPrivateKey, this.schnorr);
      const authAlgos = new KeyPairAuthAlgorithms(
        accountKeyPair,
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.barretenberg,
      );
      // Set the spendingPublicKey back to recoveryPublicKey.
      const { spendingKeyAccount } = proofRequestData;
      const [proofInput] = await this.proofInputFactory.createProofInputs(
        {
          ...proofRequestData,
          spendingKeyAccount: { ...spendingKeyAccount, spendingPublicKey },
        },
        authAlgos,
      );
      return proofInput.signingData;
    });
  }

  public async createAccountProofInput(
    userId: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    migrate: boolean,
    alias?: string,
    newSpendingPublicKey1?: GrumpkinAddress,
    newSpendingPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ): Promise<AccountProofInput> {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const newAccountPublicKey = newAccountPrivateKey ? await this.derivePublicKey(newAccountPrivateKey) : userId;
      const proofRequestData = await this.proofRequestDataFactory.createAccountProofRequestData(
        userId,
        spendingPublicKey,
        alias || '',
        newAccountPublicKey,
        newSpendingPublicKey1 || GrumpkinAddress.ZERO,
        newSpendingPublicKey2 || GrumpkinAddress.ZERO,
        { assetId: 0, value: BigInt(0) }, // deposit
        { assetId: 0, value: BigInt(0) }, // fee
        EthAddress.ZERO, // depositor
      );

      // Zero deposit and fee => no payment proofs will be created.
      // authAlgos doesn't have to be created with the user's account.
      const randomAccountPrivateKey = randomBytes(32);
      const randomAccountPublicKey = await this.derivePublicKey(randomAccountPrivateKey);
      const accountKeyPair = new ConstantKeyPair(randomAccountPublicKey, randomAccountPrivateKey, this.schnorr);
      const authAlgos = new KeyPairAuthAlgorithms(
        accountKeyPair,
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.barretenberg,
      );
      const [proofInput] = await this.proofInputFactory.createProofInputs(proofRequestData, authAlgos);
      const { tx, signingData } = proofInput as AccountProofInput;
      return { tx, signingData };
    });
  }

  public async createAccountProof(input: AccountProofInput, txRefNo: number, timeout?: number) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      return await this.runOrClientLog(
        () => this.proofOutputFactory.createAccountProof(input, input.signature!, txRefNo, timeout),
        'Failed to create account proof.',
      );
    });
  }

  public async createDefiProofInput(
    userId: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    depositValue: bigint,
    fee: bigint,
    spendingPublicKey: GrumpkinAddress,
  ): Promise<JoinSplitProofInput[]> {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);
      const userState = this.getUserState(userId);
      const user = userState.getUserData();

      const proofRequestData = await this.proofRequestDataFactory.createDefiProofRequestData(
        userId,
        spendingPublicKey,
        bridgeCallData,
        { assetId: bridgeCallData.inputAssetIdA, value: depositValue },
        { assetId: bridgeCallData.inputAssetIdA, value: fee },
        userState,
      );
      const accountKeyPair = new ConstantKeyPair(user.accountPublicKey, user.accountPrivateKey, this.schnorr);
      const authAlgos = new KeyPairAuthAlgorithms(
        accountKeyPair,
        this.grumpkin,
        this.noteAlgos,
        this.noteDecryptor,
        this.barretenberg,
      );
      const proofInputs = (await this.proofInputFactory.createProofInputs(proofRequestData, authAlgos)).map(
        proofInput => {
          if ((proofInput as PaymentProofInput).viewingKeys) {
            const { tx, viewingKeys, signingData } = proofInput as PaymentProofInput;
            return {
              tx: joinSplitTxInputToJoinSplitTx(tx, user.accountPrivateKey, user.accountPublicKey),
              viewingKeys,
              signingData,
            };
          } else {
            const { tx, viewingKey, signingData, partialStateSecretEphPubKey } = proofInput as DefiProofInput;
            return {
              tx: joinSplitTxInputToJoinSplitTx(tx, user.accountPrivateKey, user.accountPublicKey),
              viewingKeys: [viewingKey],
              signingData,
              partialStateSecretEphPubKey,
            };
          }
        },
      );
      return proofInputs;
    });
  }

  public async createDefiProof(input: JoinSplitProofInput, txRefNo: number, timeout?: number) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const { tx, viewingKeys } = input;
      const userId = tx.outputNotes[1].ownerPubKey;
      const userState = this.getUserState(userId);
      const user = userState.getUserData();
      const accountKeyPair = new ConstantKeyPair(user.accountPublicKey, user.accountPrivateKey, this.schnorr);

      return await this.runOrClientLog(
        () =>
          this.proofOutputFactory.createDefiProof(
            {
              ...input,
              viewingKey: viewingKeys[0],
              partialStateSecretEphPubKey: input.partialStateSecretEphPubKey!,
              tx: joinSplitTxToJoinSplitTxInput(tx, user.accountPrivateKey, this.noteAlgos),
            },
            input.signature!,
            txRefNo,
            accountKeyPair,
            timeout,
          ),
        'Failed to create defi proof.',
      );
    });
  }

  public async sendProofs(proofs: ProofOutput[], proofTxs: Tx[] = []) {
    return await this.serialQueue.push(async () => {
      this.assertInitState(SdkInitState.RUNNING);

      const txs = proofs.map(({ proofData, offchainTxData, signature }) => ({
        proofData: proofData.rawProofData,
        offchainTxData: offchainTxData.toBuffer(),
        depositSignature: signature,
      }));

      const txIds = await this.rollupProvider.sendTxs([...proofTxs, ...txs]);

      for (const proof of proofs) {
        const { userId } = proof.tx;
        // Proof sender may not have an account.
        await this.getUserStateUndef(userId)?.addProof(proof);

        // Add the payment proof to recipient's account if they are not the sender.
        if ([ProofId.DEPOSIT, ProofId.SEND].includes(proof.tx.proofId)) {
          const recipient = proof.outputNotes[0].owner;
          if (!recipient.equals(userId)) {
            const recipientTx = createCorePaymentTxForRecipient(proof.tx as CorePaymentTx, recipient);
            // Recipient may not have an account.
            await this.getUserStateUndef(recipient)?.addProof({ ...proof, tx: recipientTx });
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
    await this.awaitSynchronised();
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

  // TODO: Get rid of throwing behaviour.
  private getUserState(userId: GrumpkinAddress) {
    const userState = this.userStates.find(us => us.getUserData().accountPublicKey.equals(userId));
    if (!userState) {
      throw new Error(`User not found: ${userId}`);
    }
    return userState;
  }

  private getUserStateUndef(userId: GrumpkinAddress) {
    return this.userStates.find(us => us.getUserData().accountPublicKey.equals(userId));
  }

  private isSynchronised() {
    // this.debug(`isSynchronised: ${this.sdkStatus.syncedToRollup} === ${this.sdkStatus.latestRollupId}`);
    return this.sdkStatus.syncedToRollup === this.sdkStatus.latestRollupId;
  }

  private assertInitState(state: SdkInitState) {
    if (this.initState !== state) {
      throw new Error(`Init state ${this.initState} !== ${state}`);
    }
  }

  private async setLocalDataVersion(version: number) {
    await this.db.addKey('dataVersion', Buffer.from([version]));
  }

  private async getLocalDataVersion() {
    const result = await this.db.getKey('dataVersion');
    return result ? result.readInt8(0) : 0;
  }

  private async getLocalRollupContractAddress() {
    const result = await this.db.getKey('rollupContractAddress');
    return result ? new EthAddress(result) : undefined;
  }

  private async getCrsData(circuitSize: number) {
    this.debug('downloading crs data...');
    const crs = new NetCrs(circuitSize);
    await crs.init();
    this.debug('done.');
    return Buffer.from(crs.getData());
  }

  /**
   * Loads known accounts from db.
   * Registers to forward any notifications of account state updates.
   */
  private async initUserStates() {
    this.debug('initializing user states...');
    const users = await this.db.getUsers();
    await this.addInitialUserSpendingKeys(users.map(x => x.accountPublicKey));
    this.userStates = await Promise.all(users.map(u => this.userStateFactory.createUserState(u)));
    this.synchroniser.setUserStates(this.userStates);
    this.userStates.forEach(us =>
      us.on(UserStateEvent.UPDATED_USER_STATE, id => {
        this.emit(SdkEvent.UPDATED_USER_STATE, id);
        this.broadcastChannel?.postMessage({
          event: SdkEvent.UPDATED_USER_STATE,
          args: [id.toString()],
        });
      }),
    );
  }

  private async addInitialUserSpendingKeys(userIds: GrumpkinAddress[]) {
    if (!userIds.length) {
      return;
    }
    const { initialAccounts: genesisAccountsData } = await this.synchroniser.retrieveGenesisData();
    if (genesisAccountsData.length) {
      const spendingKeys = await getUserSpendingKeysFromGenesisData(
        userIds,
        genesisAccountsData,
        this.pedersen,
        this.sdkStatus.rollupSize,
      );
      this.debug(`found ${spendingKeys.length} spending keys for user${userIds.length == 1 ? '' : 's'}`);
      if (spendingKeys.length) {
        await this.db.addSpendingKeys(spendingKeys);
      }
    }
  }

  private computeAliasHash(alias: string) {
    return AliasHash.fromAlias(alias, this.blake2s);
  }

  private async runOrClientLog<T>(fn: () => Promise<T>, message: string) {
    const start = Date.now();
    try {
      return await fn();
    } catch (e: any) {
      const log = {
        message,
        error: e.message,
        timeUsed: Date.now() - start,
        memory: getDeviceMemory(),
      };
      await sendClientLog(this.rollupProvider, log);
      this.debug(log);
      throw e;
    }
  }

  public async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    return await this.rollupProvider.queryDefiPublishStats(query);
  }

  public async getBlocks(from: number, take = 1): Promise<DecodedBlock[]> {
    const rawBlocks = await this.rollupProvider.getBlocks(from, Math.min(Math.max(take, 1), 5));
    return rawBlocks.map(x => new DecodedBlock(x));
  }
}
